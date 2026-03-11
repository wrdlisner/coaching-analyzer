"""FastAPI application entry point"""

import os
import sys
from pathlib import Path

# Add parent directory to sys.path so we can import from modules/
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models  # noqa: F401 - ensure models are registered

from routers import auth, analyze, sessions, feedback, admin

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


@app.on_event("startup")
def startup():
    """Create all database tables on startup"""
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"status": "ok", "message": "Coaching Analyzer API"}
