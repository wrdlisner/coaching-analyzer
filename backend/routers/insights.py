"""Insights router: プロフィールインサイト・半期成長レポート・成長記録PDF・エンジンメタ情報"""

import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

import models
import auth as auth_utils
from database import get_db
from modules.analyzer import ENGINE_VERSION, EVAL_MODE_LABELS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["insights"])

# 半期レポートの生成に必要な期間内最小セッション数
MIN_SESSIONS_FOR_SEMIANNUAL = 3


# ---------------------------------------------------------------------------
# 半期の期間ヘルパー
# TODO: 半期の起点は暫定で暦基準（1〜6月=H1 / 7〜12月=H2。引き継ぎ書§4）
# ---------------------------------------------------------------------------

def _period_range(period_label: str) -> tuple[datetime, datetime]:
    """'2026-H1' → (開始datetime, 終了datetime(排他)) をUTCで返す"""
    year_str, half = period_label.split("-")
    year = int(year_str)
    if half == "H1":
        return (datetime(year, 1, 1, tzinfo=timezone.utc), datetime(year, 7, 1, tzinfo=timezone.utc))
    return (datetime(year, 7, 1, tzinfo=timezone.utc), datetime(year + 1, 1, 1, tzinfo=timezone.utc))


def _completed_periods(first_session_at: datetime, now: datetime) -> list[str]:
    """ユーザーの最初のセッション以降で「終了済み」の半期ラベルを新しい順で返す"""
    periods = []
    year = first_session_at.year
    while year <= now.year:
        for half in ("H1", "H2"):
            label = f"{year}-{half}"
            start, end = _period_range(label)
            if end <= now and end > first_session_at:
                periods.append(label)
        year += 1
    return sorted(periods, reverse=True)


def _naive_utc(dt: datetime) -> datetime:
    """DBのnaive datetime (UTC) と比較できるようtzinfoを外す"""
    return dt.replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/meta/engine")
def get_engine_meta():
    """現行の分析エンジンバージョン（グラフ右上の常時表示用）"""
    return {"engine_version": ENGINE_VERSION, "evaluation_modes": EVAL_MODE_LABELS}


@router.get("/insights/me")
def get_my_insight(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """「AIから見たあなた」（プロフィールインサイト）。未生成なら payload: null"""
    row = db.query(models.UserInsight).filter(
        models.UserInsight.user_id == current_user.id,
        models.UserInsight.kind == "profile",
    ).first()
    if not row:
        return {"payload": None, "engine_version": None, "updated_at": None}
    return {
        "payload": row.payload,
        "engine_version": row.engine_version,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/insights/semiannual")
def list_semiannual(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """半期レポート一覧 + いま生成できる半期（なければ null）"""
    rows = (
        db.query(models.UserInsight)
        .filter(
            models.UserInsight.user_id == current_user.id,
            models.UserInsight.kind == "semiannual",
        )
        .order_by(models.UserInsight.period_label.desc())
        .all()
    )
    generated = {r.period_label for r in rows}

    generatable = None
    first_session = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.created_at.asc())
        .first()
    )
    if first_session:
        now = datetime.now(timezone.utc)
        first_at = first_session.created_at.replace(tzinfo=timezone.utc)
        for label in _completed_periods(first_at, now):
            if label in generated:
                continue
            start, end = _period_range(label)
            count = db.query(models.Session).filter(
                models.Session.user_id == current_user.id,
                models.Session.created_at >= _naive_utc(start),
                models.Session.created_at < _naive_utc(end),
            ).count()
            if count >= MIN_SESSIONS_FOR_SEMIANNUAL:
                generatable = label
                break

    return {
        "reports": [
            {
                "period_label": r.period_label,
                "payload": r.payload,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "generatable_period": generatable,
    }


@router.post("/insights/semiannual/{period_label}/generate")
def generate_semiannual(
    period_label: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """半期レポートを同期生成する（生成済みならそれを返す＝冪等）"""
    try:
        start, end = _period_range(period_label)
    except (ValueError, IndexError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="期間の形式が不正です（例: 2026-H1）")

    # 生成済みならそのまま返す
    existing = db.query(models.UserInsight).filter(
        models.UserInsight.user_id == current_user.id,
        models.UserInsight.kind == "semiannual",
        models.UserInsight.period_label == period_label,
    ).first()
    if existing:
        return {
            "period_label": existing.period_label,
            "payload": existing.payload,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
        }

    if end > datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="この半期はまだ終了していません")

    sessions = (
        db.query(models.Session)
        .filter(
            models.Session.user_id == current_user.id,
            models.Session.created_at >= _naive_utc(start),
            models.Session.created_at < _naive_utc(end),
        )
        .order_by(models.Session.created_at.asc())
        .all()
    )
    if len(sessions) < MIN_SESSIONS_FOR_SEMIANNUAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"この半期の分析が{MIN_SESSIONS_FOR_SEMIANNUAL}回未満のためレポートを生成できません",
        )

    profile_row = db.query(models.UserInsight).filter(
        models.UserInsight.user_id == current_user.id,
        models.UserInsight.kind == "profile",
    ).first()

    from modules.insights import generate_semiannual_report
    sessions_data = [
        {
            "created_at": s.created_at.strftime("%Y-%m-%d"),
            "avg_score": s.avg_score,
            "scores": s.scores,
        }
        for s in sessions
    ]
    try:
        payload = generate_semiannual_report(
            period_label, sessions_data,
            profile_row.payload if profile_row else None,
        )
    except Exception:
        logger.error("半期レポート生成に失敗", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="レポートの生成に失敗しました。時間をおいて再度お試しください。",
        )

    row = models.UserInsight(
        user_id=current_user.id,
        kind="semiannual",
        period_label=period_label,
        payload=payload,
        engine_version=ENGINE_VERSION,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "period_label": row.period_label,
        "payload": row.payload,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/reports/growth.pdf")
def download_growth_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """成長記録PDF（全セッションの推移 + コンピテンシー別状況 + AIコメント）を都度生成"""
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.created_at.asc())
        .all()
    )
    if not sessions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分析済みのセッションがありません")

    profile_row = db.query(models.UserInsight).filter(
        models.UserInsight.user_id == current_user.id,
        models.UserInsight.kind == "profile",
    ).first()

    mode = "acc" if current_user.icf_level == "acc" else "standard"
    engine_label = f"{EVAL_MODE_LABELS.get(mode, mode)} · v{ENGINE_VERSION}"

    from modules.reporter import generate_growth_report
    sessions_data = [
        {"created_at": s.created_at, "avg_score": s.avg_score, "scores": s.scores}
        for s in sessions
    ]
    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = generate_growth_report(
            user_name=current_user.name,
            sessions_data=sessions_data,
            insight=profile_row.payload if profile_row else None,
            output_dir=Path(tmp_dir),
            engine_label=engine_label,
        )
        pdf_bytes = pdf_path.read_bytes()

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=growth_report_{date_str}.pdf"
        },
    )
