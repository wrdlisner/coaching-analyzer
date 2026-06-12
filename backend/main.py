"""FastAPI application entry point"""

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to sys.path so we can import from modules/
sys.path.insert(0, str(Path(__file__).parent.parent))

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pathlib import Path
from sqlalchemy import text
from database import engine, Base, SessionLocal
import models  # noqa: F401 - ensure models are registered

from routers import auth, analyze, sessions, feedback, admin, notices, manager, payments, mentors

# uvicorn起動前のimport時ログ（CORS設定等）も出力されるようにする
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Coaching Analyzer API", version="1.1.0")

# CORS middleware
# Note: allow_credentials=True requires explicit origins (not "*")
# FRONTEND_URL 環境変数で本番フロントエンドURLを追加できる
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    # カンマ区切りで複数のURLを指定可能（例: https://foo.railway.app,https://bar.com）
    for url in frontend_url.split(","):
        url = url.strip().rstrip("/")
        if url:
            ALLOWED_ORIGINS.append(url)

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(sessions.router)
app.include_router(feedback.router)
app.include_router(admin.router)
app.include_router(notices.router)
app.include_router(manager.router)
app.include_router(payments.router)
app.include_router(mentors.router)


def delete_expired_sessions():
    """期限切れセッションを削除する（毎日深夜2時に実行）"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired_ids = [
            row[0]
            for row in db.query(models.Session.id).filter(
                models.Session.expires_at != None,
                models.Session.expires_at <= now,
            ).all()
        ]
        if expired_ids:
            # FK制約があるため、子レコード（フィードバック・分析ジョブ）を先に処理する
            db.query(models.AnalysisJob).filter(
                models.AnalysisJob.session_id.in_(expired_ids)
            ).update({models.AnalysisJob.session_id: None}, synchronize_session=False)
            db.query(models.Feedback).filter(
                models.Feedback.session_id.in_(expired_ids)
            ).delete(synchronize_session=False)
            db.query(models.Session).filter(
                models.Session.id.in_(expired_ids)
            ).delete(synchronize_session=False)
            db.commit()
            logger.info(f"期限切れセッション {len(expired_ids)} 件を削除しました")
    except Exception as e:
        logger.error(f"セッション自動削除エラー: {e}")
        db.rollback()
    finally:
        db.close()


def _fail_stale_jobs():
    """再デプロイ・クラッシュで中断されたジョブをfailedにし、クレジットを返金する。

    バックグラウンドタスクはプロセスと共に消えるため、起動時点で
    pending/processingのまま残っているジョブは再開不能。
    """
    db = SessionLocal()
    try:
        stale_jobs = db.query(models.AnalysisJob).filter(
            models.AnalysisJob.status.in_(["pending", "processing"])
        ).all()
        for job in stale_jobs:
            job.status = "failed"
            job.error_message = "サーバーの再起動により分析が中断されました。クレジットは返金済みです。お手数ですが再度アップロードしてください。"
            job.updated_at = datetime.now(timezone.utc)
            user = db.query(models.User).filter(models.User.id == job.user_id).first()
            if user:
                user.credits += 1
                db.add(models.Credit(user_id=job.user_id, amount=1, reason="refund"))
        if stale_jobs:
            db.commit()
            logger.info(f"中断されたジョブ {len(stale_jobs)} 件をfailedにして返金しました")
    except Exception as e:
        logger.error(f"中断ジョブの復旧処理エラー: {e}")
        db.rollback()
    finally:
        db.close()


def _run_migrations():
    """既存テーブルへのカラム追加（create_allでは対応できないため手動で実行）"""
    migrations = [
        "ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE",
        "ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id)",
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN mentor_status VARCHAR(20) NOT NULL DEFAULT 'none'",
        "ALTER TABLE mentors ADD COLUMN session_duration_minutes INTEGER",
        "ALTER TABLE mentors ADD COLUMN session_price_jpy INTEGER",
        "ALTER TABLE password_reset_tokens ADD COLUMN used_at TIMESTAMP",
        "ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS used",
        "ALTER TYPE credit_reason_enum ADD VALUE IF NOT EXISTS 'refund'",
        "ALTER TABLE coupons ADD COLUMN reserved_until TIMESTAMP",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"Migration applied: {sql}")
            except Exception:
                conn.rollback()  # 既にカラムが存在する場合はスキップ

    # referral_codeが未設定の既存ユーザーにコードを付与
    import random
    import string
    db = SessionLocal()
    try:
        users_without_code = db.query(models.User).filter(models.User.referral_code == None).all()
        for user in users_without_code:
            chars = string.ascii_uppercase + string.digits
            for _ in range(20):
                code = "".join(random.choices(chars, k=8))
                if not db.query(models.User).filter(models.User.referral_code == code).first():
                    user.referral_code = code
                    break
        if users_without_code:
            db.commit()
            logger.info(f"既存ユーザー {len(users_without_code)} 件に紹介コードを付与しました")
    except Exception as e:
        logger.error(f"紹介コード付与エラー: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
def startup():
    """Create all database tables on startup"""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    _fail_stale_jobs()

    scheduler = BackgroundScheduler()
    scheduler.add_job(delete_expired_sessions, "cron", hour=2, minute=0)
    scheduler.start()
    logger.info("自動削除スケジューラを起動しました（毎日 02:00 UTC）")


@app.get("/")
def root():
    return {"status": "ok", "message": "Coaching Analyzer API"}
