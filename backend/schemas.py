"""Pydantic schemas"""

from datetime import datetime, timezone
from typing import Annotated, Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, EmailStr


def _ensure_utc(v: datetime) -> datetime:
    """naive datetime（DB から返る UTC 値）に UTC タイムゾーンを付与する。"""
    if isinstance(v, datetime) and v.tzinfo is None:
        return v.replace(tzinfo=timezone.utc)
    return v


# DB の naive datetime を UTC-aware に変換するアノテーション型
UTCDatetime = Annotated[datetime, BeforeValidator(_ensure_utc)]


# ---- Auth ----

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    icf_level: str = "none"
    referral_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    icf_level: str
    credits: int
    is_admin: bool
    referral_code: Optional[str]
    created_at: UTCDatetime

    class Config:
        from_attributes = True


class AdminUserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    icf_level: str
    credits: int
    is_admin: bool
    created_at: UTCDatetime
    analysis_count: int = 0

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    icf_level: Optional[str] = None


class UpdateCreditsRequest(BaseModel):
    amount: int
    reason: str = "bonus"


# ---- Sessions ----

class SessionResponse(BaseModel):
    id: UUID
    duration_seconds: float
    coach_ratio: float
    avg_score: float
    scores: Optional[Any]
    created_at: UTCDatetime

    class Config:
        from_attributes = True


# ---- Feedback ----

class FeedbackRequest(BaseModel):
    satisfaction: int
    accuracy: int
    comment: Optional[str] = None


class AdminFeedbackResponse(BaseModel):
    id: UUID
    session_id: UUID
    user_name: str
    user_email: str
    satisfaction: int
    accuracy: int
    comment: Optional[str]
    created_at: UTCDatetime


# ---- Credits ----

class CreditResponse(BaseModel):
    id: UUID
    amount: int
    reason: str
    created_at: UTCDatetime

    class Config:
        from_attributes = True


# ---- Analyze ----

class AnalyzeResponse(BaseModel):
    session_id: UUID
    avg_score: float


class JobAcceptedResponse(BaseModel):
    job_id: UUID


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: str  # pending | processing | completed | failed
    session_id: Optional[UUID] = None
    error_message: Optional[str] = None


# ---- Trends ----

class TrendDataPoint(BaseModel):
    date: str
    analysis_count: int
    avg_score: Optional[float]
    avg_satisfaction: Optional[float]
    avg_accuracy: Optional[float]


# ---- Notices ----

class NoticeResponse(BaseModel):
    id: UUID
    title: str
    body: str
    published_at: Optional[UTCDatetime]
    is_published: bool
    created_at: UTCDatetime

    class Config:
        from_attributes = True


class NoticeCreateRequest(BaseModel):
    title: str
    body: str
    published_at: Optional[datetime] = None
    is_published: bool = False


class NoticeUpdateRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    published_at: Optional[datetime] = None
    is_published: Optional[bool] = None


# ---- Coupons ----

class CouponResponse(BaseModel):
    id: UUID
    code: str
    discount_amount: int
    expires_at: UTCDatetime
    used_at: Optional[UTCDatetime]
    created_at: UTCDatetime

    class Config:
        from_attributes = True


class FeedbackSubmitResponse(BaseModel):
    success: bool = True
    coupon: Optional[CouponResponse] = None


# ---- Generic ----

class SuccessResponse(BaseModel):
    success: bool = True
