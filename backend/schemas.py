"""Pydantic schemas"""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ---- Auth ----

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    icf_level: str = "none"


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
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    icf_level: str
    credits: int
    is_admin: bool
    created_at: datetime
    analysis_count: int = 0

    class Config:
        from_attributes = True


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
    created_at: datetime

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
    created_at: datetime


class ShareRequest(BaseModel):
    post_url: str


# ---- Credits ----

class CreditResponse(BaseModel):
    id: UUID
    amount: int
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Analyze ----

class AnalyzeResponse(BaseModel):
    session_id: UUID
    avg_score: float


# ---- Trends ----

class TrendDataPoint(BaseModel):
    date: str
    analysis_count: int
    avg_score: Optional[float]
    avg_satisfaction: Optional[float]
    avg_accuracy: Optional[float]


# ---- Generic ----

class SuccessResponse(BaseModel):
    success: bool = True
