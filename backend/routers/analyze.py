"""Analyze router: upload audio and run full analysis pipeline (async job)"""

import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db, SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analyze"])


# ---------------------------------------------------------------------------
# 分析ティア定義
# モデルIDはクライアントから受け取らず、必ずこのマップでサーバー側解決する
# ---------------------------------------------------------------------------
ANALYSIS_TIERS = {
    "standard": {"label": "通常分析", "model": "claude-sonnet-4-6", "credits": 1, "deep": False},
    "deep": {"label": "ディープ分析", "model": "claude-opus-4-8", "credits": 2, "deep": True},
}


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _run_analysis(job_id: UUID, user_id: UUID, input_path: Path, suffix: str, session_type: str, analysis_tier: str = "standard"):
    """バックグラウンドで分析パイプラインを実行する"""
    db = SessionLocal()
    mp3_path = None
    is_temp_mp3 = False
    tier = ANALYSIS_TIERS.get(analysis_tier, ANALYSIS_TIERS["standard"])

    try:
        # ジョブを processing に更新
        job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == job_id).first()
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Convert to mp3 if needed
        from modules.converter import convert_to_mp3
        mp3_path, is_temp_mp3 = convert_to_mp3(input_path)

        # Transcribe
        from modules.transcriber import transcribe
        transcription = transcribe(mp3_path)

        # Analyze
        from modules.analyzer import analyze_session
        is_follow_up = session_type == "follow_up"
        analysis = analyze_session(
            transcription["utterances"],
            is_follow_up=is_follow_up,
            model=tier["model"],
            deep=tier["deep"],
        )

        # Generate PDF
        with tempfile.TemporaryDirectory() as tmp_dir:
            from modules.reporter import generate_report
            pdf_path = generate_report(
                analysis=analysis,
                transcription=transcription,
                output_dir=Path(tmp_dir),
            )
            pdf_bytes = pdf_path.read_bytes()

        # Compute metrics
        competencies = analysis.get("competencies", [])
        avg_score = (
            sum(c["score"] for c in competencies) / len(competencies)
            if competencies else 0.0
        )
        total_chars = transcription["coach_word_count"] + transcription["client_word_count"]
        coach_ratio = (
            round(transcription["coach_word_count"] / total_chars * 100)
            if total_chars > 0 else 0
        )
        scores_json = {
            "analysis_tier": analysis_tier,
            "competencies": competencies,
            "overall_summary": analysis.get("overall_summary", ""),
            "qualification_comment": analysis.get("qualification_comment", ""),
            "strengths_improvements": analysis.get("strengths_improvements"),
            "pcc_fulfillment_rate": analysis.get("pcc_fulfillment_rate", 0.0),
            "mcc_evaluation": analysis.get("mcc_evaluation"),
            "deep_dive": analysis.get("deep_dive"),
        }

        # Save session
        # （クレジットはアップロード受付時に減算済み）
        user = db.query(models.User).filter(models.User.id == user_id).first()
        session = models.Session(
            user_id=user_id,
            duration_seconds=transcription["duration_seconds"],
            coach_ratio=float(coach_ratio),
            avg_score=avg_score,
            scores=scores_json,
            pdf_data=pdf_bytes,
            expires_at=datetime.now(timezone.utc) + timedelta(days=180),
        )
        db.add(session)
        db.flush()

        # ジョブを completed に更新
        job.status = "completed"
        job.session_id = session.id
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(f"[job {job_id}] completed: session_id={session.id}")

        # 初回分析完了時：紹介者に+1クレジット付与
        # レポート保存とは別トランザクションにする（付与失敗が完了済み分析を
        # 巻き込んでロールバックさせないため）
        try:
            session_count = db.query(models.Session).filter(
                models.Session.user_id == user_id
            ).count()
            if session_count == 1 and user.referred_by:
                referrer = db.query(models.User).filter(models.User.id == user.referred_by).first()
                if referrer:
                    referrer.credits += 1
                    db.add(models.Credit(
                        user_id=referrer.id,
                        amount=1,
                        reason="referral",
                    ))
                    db.commit()
                    logger.info(f"[job {job_id}] 紹介者 {referrer.id} に+1クレジット付与")
        except Exception:
            logger.error(f"[job {job_id}] 紹介ボーナス付与に失敗（分析結果は保存済み）", exc_info=True)
            db.rollback()

    except Exception as e:
        logger.error(f"[job {job_id}] failed: {e}", exc_info=True)
        # ValueError/RuntimeErrorは各モジュールが投げるユーザー向けメッセージ。
        # それ以外（DBエラー等）は内部情報を含むため汎用メッセージに置き換える
        if isinstance(e, (ValueError, RuntimeError)):
            user_message = str(e)
        else:
            user_message = "分析処理中に予期しないエラーが発生しました。クレジットは返金済みです。時間をおいて再度お試しください。"
        try:
            db.rollback()
            job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = user_message
                job.updated_at = datetime.now(timezone.utc)

            # 受付時に減算したクレジットを返金する（ティアに応じた消費分）
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.credits += tier["credits"]
                db.add(models.Credit(user_id=user_id, amount=tier["credits"], reason="refund"))
            db.commit()
        except Exception:
            logger.error(f"[job {job_id}] failed-state更新/返金に失敗", exc_info=True)
    finally:
        db.close()
        # クリーンアップ
        if is_temp_mp3 and mp3_path and mp3_path.exists():
            mp3_path.unlink()
        if input_path.exists():
            input_path.unlink()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=schemas.JobAcceptedResponse, status_code=202)
async def analyze_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_type: str = Form("initial"),
    analysis_tier: str = Form("standard"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    logger.info(f"[analyze] session_type='{session_type}' tier='{analysis_tier}' file='{file.filename}' user={current_user.email}")

    # ティアの検証（不正値は400）
    tier = ANALYSIS_TIERS.get(analysis_tier)
    if tier is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不正な分析プランが指定されました",
        )

    # 拡張子チェック
    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    if suffix not in (".mp3", ".mp4", ".m4a"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mp3、mp4、m4aファイルのみアップロードできます",
        )

    # ファイルサイズチェック（フロントエンドと同じ500MB上限をサーバー側でも強制）
    content = await file.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ファイルサイズは500MB以下にしてください",
        )

    # アップロードファイルを永続的な一時ファイルに保存
    tmp_input = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_input.write(content)
    tmp_input.close()
    input_path = Path(tmp_input.name)

    try:
        # クレジットを受付時に原子的に減算する
        # （残高チェックと減算を1つのUPDATEで行い、同時アップロードによる二重消費を防ぐ。
        #   分析失敗時は _run_analysis 内で返金する）
        cost = tier["credits"]
        updated = (
            db.query(models.User)
            .filter(
                models.User.id == current_user.id,
                models.User.credits >= cost,
            )
            .update({models.User.credits: models.User.credits - cost}, synchronize_session=False)
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"クレジットが不足しています（{tier['label']}には{cost}クレジット必要です）",
            )
        db.add(models.Credit(user_id=current_user.id, amount=-cost, reason="analysis"))

        # ジョブをDBに登録
        job = models.AnalysisJob(user_id=current_user.id, status="pending")
        db.add(job)
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        input_path.unlink(missing_ok=True)
        raise

    # バックグラウンドタスクとして分析を起動
    background_tasks.add_task(
        _run_analysis,
        job_id=job.id,
        user_id=current_user.id,
        input_path=input_path,
        suffix=suffix,
        session_type=session_type,
        analysis_tier=analysis_tier,
    )

    logger.info(f"[analyze] job {job.id} queued")
    return schemas.JobAcceptedResponse(job_id=job.id)


@router.get("/analyze/status/{job_id}", response_model=schemas.JobStatusResponse)
def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    job = db.query(models.AnalysisJob).filter(
        models.AnalysisJob.id == job_id,
        models.AnalysisJob.user_id == current_user.id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")

    return schemas.JobStatusResponse(
        job_id=job.id,
        status=job.status,
        session_id=job.session_id,
        error_message=job.error_message,
    )
