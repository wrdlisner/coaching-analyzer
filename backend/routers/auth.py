"""Auth router: register, login, me"""

import os
import random
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db
from email_utils import send_password_reset_email

# カンマ区切りの場合は最初のURLを使用（main.pyと同様の環境変数）
_raw_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
FRONTEND_URL = _raw_frontend_url.split(",")[0].strip().rstrip("/")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_referral_code(db: Session) -> str:
    chars = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = "".join(random.choices(chars, k=8))
        if not db.query(models.User).filter(models.User.referral_code == code).first():
            return code
    raise RuntimeError("紹介コードの生成に失敗しました")


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスはすでに登録されています",
        )

    icf_level = body.icf_level.lower()
    if icf_level not in ("acc", "pcc", "mcc", "none"):
        icf_level = "none"

    # 紹介者を検索
    referrer = None
    if body.referral_code:
        referrer = db.query(models.User).filter(
            models.User.referral_code == body.referral_code
        ).first()

    referral_code = _generate_referral_code(db)

    user = models.User(
        name=body.name,
        email=body.email,
        password_hash=auth_utils.hash_password(body.password),
        icf_level=icf_level,
        credits=1,
        referral_code=referral_code,
        referred_by=referrer.id if referrer else None,
    )
    db.add(user)
    db.flush()

    credit = models.Credit(
        user_id=user.id,
        amount=1,
        reason="bonus",
    )
    db.add(credit)
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token)


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_utils.verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token)


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=schemas.SuccessResponse)
def forgot_password(
    body: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # ユーザーが存在しなくても成功レスポンスを返す（メールアドレス列挙攻撃を防ぐ）
    if user:
        # 既存の未使用トークンを無効化
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used_at == None,
        ).delete()

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        reset_token = models.PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        background_tasks.add_task(send_password_reset_email, user.email, reset_url)

    return {"success": True}


@router.post("/reset-password", response_model=schemas.SuccessResponse)
def reset_password(
    body: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="パスワードは8文字以上で設定してください",
        )

    now = datetime.now(timezone.utc)
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == body.token,
        models.PasswordResetToken.used_at == None,
        models.PasswordResetToken.expires_at > now,
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="リセットリンクが無効または期限切れです。もう一度お試しください。",
        )

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    user.password_hash = auth_utils.hash_password(body.new_password)
    reset_token.used_at = now
    db.commit()

    return {"success": True}


@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    body: schemas.UpdateProfileRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.icf_level is not None:
        icf_level = body.icf_level.lower()
        if icf_level not in ("acc", "pcc", "mcc", "none"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="icf_level は acc / pcc / mcc / none のいずれかを指定してください")
        current_user.icf_level = icf_level
    db.commit()
    db.refresh(current_user)
    return current_user
