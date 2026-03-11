"""Admin router: user management (admin only)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: models.User = Depends(auth_utils.get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user


@router.get("/users", response_model=List[schemas.AdminUserResponse])
def list_users(
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.patch("/users/{user_id}/credits")
def update_user_credits(
    user_id: str,
    body: schemas.UpdateCreditsRequest,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    user.credits += body.amount
    credit = models.Credit(user_id=user.id, amount=body.amount, reason="bonus")
    db.add(credit)
    db.commit()
    db.refresh(user)
    return {"user_id": str(user.id), "new_credits": user.credits}


@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin(
    user_id: str,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    user.is_admin = not user.is_admin
    db.commit()
    return {"user_id": str(user.id), "is_admin": user.is_admin}
