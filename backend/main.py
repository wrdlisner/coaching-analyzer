"""FastAPI application entry point"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to sys.path so we can import from modules/
sys.path.insert(0, str(Path(__file__).parent.parent))

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
import models  # noqa: F401 - ensure models are registered

from routers import auth, analyze, sessions, feedback, admin

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
    ALLOWED_ORIGINS.append(frontend_url.rstrip("/"))

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


def delete_expired_sessions():
    """期限切れセッションを削除する（毎日深夜2時に実行）"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
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


@app.on_event("startup")
def startup():
    """Create all database tables on startup"""
    Base.metadata.create_all(bind=engine)

    scheduler = BackgroundScheduler()
    scheduler.add_job(delete_expired_sessions, "cron", hour=2, minute=0)
    scheduler.start()
    logger.info("自動削除スケジューラを起動しました（毎日 02:00 UTC）")


@app.get("/")
def root():
    return {"status": "ok", "message": "Coaching Analyzer API"}
