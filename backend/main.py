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

from sqlalchemy import text
from database import engine, Base, SessionLocal
import models  # noqa: F401 - ensure models are registered

from routers import auth, analyze, sessions, feedback, admin, notices, manager, payments

logger = logging.getLogger(__name__)

app = FastAPI(title="Coaching Analyzer API", version="1.0.0")

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


def delete_expired_sessions():
    """期限切れセッションを削除する（毎日深夜2時に実行）"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired = db.query(models.Session).filter(
            models.Session.expires_at != None,
            models.Session.expires_at <= now,
        ).all()
        count = len(expired)
        for session in expired:
            db.delete(session)
        db.commit()
        if count:
            logger.info(f"期限切れセッション {count} 件を削除しました")
    except Exception as e:
        logger.error(f"セッション自動削除エラー: {e}")
        db.rollback()
    finally:
        db.close()


def _run_migrations():
    """既存テーブルへのカラム追加（create_allでは対応できないため手動で実行）"""
    migrations = [
        "ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE",
        "ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"Migration applied: {sql}")
            except Exception:
                conn.rollback()  # 既にカラムが存在する場合はスキップ


@app.on_event("startup")
def startup():
    """Create all database tables on startup"""
    Base.metadata.create_all(bind=engine)
    _run_migrations()

    scheduler = BackgroundScheduler()
    scheduler.add_job(delete_expired_sessions, "cron", hour=2, minute=0)
    scheduler.start()
    logger.info("自動削除スケジューラを起動しました（毎日 02:00 UTC）")


@app.get("/")
def root():
    return {"status": "ok", "message": "Coaching Analyzer API"}
