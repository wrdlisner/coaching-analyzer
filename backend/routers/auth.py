"""Auth router: register, login, me"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスはすでに登録されています",
        )

    icf_level = body.icf_level.lower()
    if icf_level not in ("acc", "pcc", "mcc", "none"):
        icf_level = "none"

    user = models.User(
        name=body.name,
        email=body.email,
        password_hash=auth_utils.hash_password(body.password),
        icf_level=icf_level,
        credits=1,
    )
    db.add(user)
    db.flush()  # get user.id before commit

    # Add bonus credit record
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
