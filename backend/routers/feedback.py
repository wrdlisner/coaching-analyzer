"""Feedback, share, and credits routers"""

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback/{session_id}", response_model=schemas.SuccessResponse)
def submit_feedback(
    session_id: UUID,
    body: schemas.FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="セッションが見つかりません")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")

    if not (1 <= body.satisfaction <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="満足度は1〜5で入力してください")
    if not (1 <= body.accuracy <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="精度評価は1〜5で入力してください")

    feedback = models.Feedback(
        session_id=session_id,
        satisfaction=body.satisfaction,
        accuracy=body.accuracy,
        comment=body.comment,
    )
    db.add(feedback)

    # Give +1 credit
    current_user.credits += 1
    credit_record = models.Credit(
        user_id=current_user.id,
        amount=1,
        reason="feedback",
    )
    db.add(credit_record)
    db.commit()

    return schemas.SuccessResponse()


@router.post("/sessions/{session_id}/share", response_model=schemas.SuccessResponse)
def confirm_share(
    session_id: UUID,
    body: schemas.ShareRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="セッションが見つかりません")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")

    # Give +1 credit for SNS share
    current_user.credits += 1
    credit_record = models.Credit(
        user_id=current_user.id,
        amount=1,
        reason="sns_share",
    )
    db.add(credit_record)
    db.commit()

    return schemas.SuccessResponse()


@router.get("/credits", response_model=List[schemas.CreditResponse])
def get_credit_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    credits = (
        db.query(models.Credit)
        .filter(models.Credit.user_id == current_user.id)
        .order_by(models.Credit.created_at.desc())
        .all()
    )
    return credits
