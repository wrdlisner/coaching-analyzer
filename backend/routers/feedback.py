"""Feedback and credits routers"""

import random
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api", tags=["feedback"])

COUPON_MAX_UNUSED = 5
COUPON_EXPIRY_DAYS = 30
MILESTONE_DISCOUNTS = {3: 200, 5: 300}
DEFAULT_DISCOUNT = 100


def _generate_coupon_code(db: Session) -> str:
    chars = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = "FB-" + "".join(random.choices(chars, k=6))
        if not db.query(models.Coupon).filter(models.Coupon.code == code).first():
            return code
    raise RuntimeError("クーポンコードの生成に失敗しました")


@router.post("/feedback/{session_id}", response_model=schemas.FeedbackSubmitResponse)
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

    # 既存のフィードバック数を取得（このセッションへの重複送信を防ぐ）
    existing = db.query(models.Feedback).filter(
        models.Feedback.session_id == session_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="このセッションにはすでにフィードバックを送信済みです")

    # フィードバック保存
    feedback = models.Feedback(
        session_id=session_id,
        satisfaction=body.satisfaction,
        accuracy=body.accuracy,
        comment=body.comment,
    )
    db.add(feedback)
    db.flush()  # IDを確定させる

    # このユーザーの累計フィードバック数（今回のフィードバックを含む）
    user_session_ids = (
        db.query(models.Session.id)
        .filter(models.Session.user_id == current_user.id)
        .subquery()
    )
    total_count = db.query(models.Feedback).filter(
        models.Feedback.session_id.in_(user_session_ids)
    ).count()

    # 未使用クーポンが上限に達していればクーポンは発行しない
    unused_count = db.query(models.Coupon).filter(
        models.Coupon.user_id == current_user.id,
        models.Coupon.used_at == None,
    ).count()

    coupon = None
    if unused_count < COUPON_MAX_UNUSED:
        discount = MILESTONE_DISCOUNTS.get(total_count, DEFAULT_DISCOUNT)
        code = _generate_coupon_code(db)
        coupon = models.Coupon(
            user_id=current_user.id,
            code=code,
            discount_amount=discount,
            expires_at=datetime.now(timezone.utc) + timedelta(days=COUPON_EXPIRY_DAYS),
        )
        db.add(coupon)

    db.commit()
    if coupon:
        db.refresh(coupon)

    return schemas.FeedbackSubmitResponse(success=True, coupon=coupon)


@router.get("/coupons", response_model=List[schemas.CouponResponse])
def get_coupons(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """未使用・期限内のクーポン一覧を返す"""
    now = datetime.now(timezone.utc)
    coupons = (
        db.query(models.Coupon)
        .filter(
            models.Coupon.user_id == current_user.id,
            models.Coupon.used_at == None,
            models.Coupon.expires_at > now,
        )
        .order_by(models.Coupon.expires_at.asc())
        .all()
    )
    return coupons


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
