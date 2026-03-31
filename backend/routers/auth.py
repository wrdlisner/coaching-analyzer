"""Auth router: register, login, me"""

import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

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
