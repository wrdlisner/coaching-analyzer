"""Payments router: Stripe Checkout and Webhook"""

import logging
import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import auth as auth_utils
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://frontend-production-9f67.up.railway.app")

PACK_CONFIG = {
    "1": {"price": 500, "credits": 1},
    "3": {"price": 1200, "credits": 3},
    "10": {"price": 3500, "credits": 10},
}


class CheckoutRequest(BaseModel):
    pack: str


@router.post("/checkout")
def create_checkout(
    body: CheckoutRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if body.pack not in PACK_CONFIG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pack は '1', '3', '10' のいずれかを指定してください",
        )

    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe設定が不完全です",
        )

    config = PACK_CONFIG[body.pack]
    stripe.api_key = STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": "jpy",
                        "unit_amount": config["price"],
                        "product_data": {
                            "name": f"クレジット {config['credits']}回分",
                        },
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{FRONTEND_URL}/dashboard?payment=success",
            cancel_url=f"{FRONTEND_URL}/dashboard?payment=cancel",
            metadata={
                "user_id": str(current_user.id),
                "pack": body.pack,
                "credits_to_add": str(config["credits"]),
            },
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Checkout Session作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="決済セッションの作成に失敗しました",
        )

    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook設定が不完全です",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        metadata = session_obj.get("metadata", {})
        user_id = metadata.get("user_id")
        credits_to_add = metadata.get("credits_to_add")

        if not user_id or not credits_to_add:
            logger.error(f"Webhookメタデータ不足: {metadata}")
            return {"status": "ignored"}

        try:
            credits_int = int(credits_to_add)
        except (ValueError, TypeError):
            logger.error(f"credits_to_add が不正な値です: {credits_to_add}")
            return {"status": "ignored"}

        user = db.query(models.User).filter(
            models.User.id == user_id
        ).first()

        if not user:
            logger.error(f"ユーザーが見つかりません: {user_id}")
            return {"status": "ignored"}

        user.credits += credits_int
        credit_record = models.Credit(
            user_id=user.id,
            amount=credits_int,
            reason="bonus",
        )
        db.add(credit_record)
        db.commit()
        logger.info(f"クレジット追加完了: user_id={user_id}, credits={credits_int}")

    return {"status": "ok"}
