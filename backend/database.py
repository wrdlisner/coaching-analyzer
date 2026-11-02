"""SQLAlchemy database setup"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/coaching_analyzer"
)

# Railway の Postgres は待機中の接続を切ることがある。
# プールに残った切断済み接続をそのまま使うと、最初のリクエストだけ 500 になるため、
# 使う直前に疎通を確認し、古い接続は作り直す。
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
