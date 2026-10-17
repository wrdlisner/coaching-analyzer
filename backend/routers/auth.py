"""Auth router: register, login, me"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db
from email_utils import send_password_reset_email, send_password_setup_email
from user_service import create_user, find_user_by_email

# カンマ区切りの場合は最初のURLを使用（main.pyと同様の環境変数）
_raw_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
FRONTEND_URL = _raw_frontend_url.split(",")[0].strip().rstrip("/")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_reset_token(token: str) -> str:
    """リセットトークンはハッシュ化して保存する（DB漏洩時の乗っ取りを防ぐ）"""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # reset-passwordと同じ基準をサーバー側でも強制する
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="パスワードは8文字以上で設定してください",
        )

    if find_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスはすでに登録されています",
        )

    user = create_user(
        db,
        name=body.name,
        email=body.email,
        password_hash=auth_utils.hash_password(body.password),
        icf_level=body.icf_level,
        referral_code=body.referral_code,
        signup_method="password",
    )
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token)


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = find_user_by_email(db, body.email)
    # password_hash が NULL(Googleのみのユーザー)の場合も、存在を明かさず同じエラーにする
    if (
        not user
        or not user.password_hash
        or not auth_utils.verify_password(body.password, user.password_hash)
    ):
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
    user = find_user_by_email(db, body.email)
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
            token=_hash_reset_token(token),
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        # パスワード未設定(Googleのみ)のユーザーには「Googleでログインできます」を添えた設定メールを送る
        send = send_password_reset_email if user.password_hash else send_password_setup_email
        background_tasks.add_task(send, user.email, reset_url)

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
        models.PasswordResetToken.token == _hash_reset_token(body.token),
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
    # リセットメールを受け取れた = メールの受信箱を持っていることの確認になる
    if user.email_verified_at is None:
        user.email_verified_at = now
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
