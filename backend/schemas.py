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
    role: str = "user"
    mentor_status: str = "none"
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


# ---- Mentors ----

class MentorApplyRequest(BaseModel):
    display_name: str
    credential: str  # PCC / MCC
    coaching_years: int
    bio: str
    photo_url: Optional[str] = None
    specialties: List[str]
    client_type: str  # individual / corporate / both
    style_note: Optional[str] = None
    contact_url: str
    sns_url: Optional[str] = None


class MentorUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    credential: Optional[str] = None
    coaching_years: Optional[int] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    specialties: Optional[List[str]] = None
    client_type: Optional[str] = None
    style_note: Optional[str] = None
    contact_url: Optional[str] = None
    sns_url: Optional[str] = None


class MentorResponse(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    credential: str
    coaching_years: int
    bio: str
    photo_url: Optional[str]
    specialties: List[str]
    client_type: str
    style_note: Optional[str]
    contact_url: str
    sns_url: Optional[str]
    is_active: bool
    view_count: int
    click_count: int
    created_at: UTCDatetime
    updated_at: UTCDatetime

    class Config:
        from_attributes = True


class AdminMentorResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    display_name: str
    credential: str
    coaching_years: int
    bio: str
    photo_url: Optional[str]
    specialties: List[str]
    client_type: str
    contact_url: str
    is_active: bool
    mentor_status: str
    created_at: UTCDatetime


# ---- Generic ----

class SuccessResponse(BaseModel):
    success: bool = True
