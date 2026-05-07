"""SQLAlchemy models"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Text, LargeBinary,
    DateTime, ForeignKey, Enum as SAEnum, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    icf_level = Column(
        SAEnum("acc", "pcc", "mcc", "none", name="icf_level_enum"),
        nullable=False,
        default="none"
    )
    credits = Column(Integer, nullable=False, default=0)
    is_admin = Column(Boolean, nullable=False, default=False)
    role = Column(String(20), nullable=False, default="user")
    mentor_status = Column(String(20), nullable=False, default="none")
    referral_code = Column(String(20), unique=True, nullable=True, index=True)
    referred_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sessions = relationship("Session", back_populates="user")
    credit_records = relationship("Credit", back_populates="user")
    notice_reads = relationship("NoticeRead", back_populates="user")
    coupons = relationship("Coupon", back_populates="user")
    mentor_profile = relationship("Mentor", back_populates="user", uselist=False)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    duration_seconds = Column(Float, nullable=False, default=0.0)
    coach_ratio = Column(Float, nullable=False, default=0.0)
    avg_score = Column(Float, nullable=False, default=0.0)
    scores = Column(JSON, nullable=True)
    pdf_data = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    feedbacks = relationship("Feedback", back_populates="session")


class Credit(Base):
    __tablename__ = "credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(
        SAEnum("analysis", "feedback", "bonus", "referral", "purchase", name="credit_reason_enum"),
        nullable=False
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="credit_records")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    satisfaction = Column(Integer, nullable=False)
    accuracy = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="feedbacks")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    published_at = Column(DateTime, nullable=True)
    is_published = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    reads = relationship("NoticeRead", back_populates="notice")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(
        SAEnum("pending", "processing", "completed", "failed", name="job_status_enum"),
        nullable=False,
        default="pending",
    )
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NoticeRead(Base):
    __tablename__ = "notice_reads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notice_id = Column(UUID(as_uuid=True), ForeignKey("notices.id"), nullable=False)
    read_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notice_reads")
    notice = relationship("Notice", back_populates="reads")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    discount_amount = Column(Integer, nullable=False)  # ¥100 / 200 / 300
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="coupons")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Mentor(Base):
    __tablename__ = "mentors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    display_name = Column(String(255), nullable=False)
    credential = Column(String(10), nullable=False)  # PCC / MCC
    coaching_years = Column(Integer, nullable=False)
    bio = Column(Text, nullable=False)
    photo_url = Column(Text, nullable=True)

    specialties = Column(ARRAY(String), nullable=False, default=[])
    client_type = Column(String(20), nullable=False)  # individual / corporate / both
    style_note = Column(Text, nullable=True)

    session_duration_minutes = Column(Integer, nullable=True)   # 例: 60
    session_price_jpy = Column(Integer, nullable=True)          # 例: 10000

    contact_url = Column(Text, nullable=False)
    sns_url = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    view_count = Column(Integer, nullable=False, default=0)
    click_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="mentor_profile")
