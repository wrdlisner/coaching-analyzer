"""ユーザー作成・検索の共通処理

メール+パスワード登録とGoogle登録(設計書②)で同じ処理を通すため、
routers/auth.py の register から切り出したもの。
"""

import random
import string
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import models

VALID_ICF_LEVELS = ("acc", "pcc", "mcc", "none")
SIGNUP_BONUS_CREDITS = 1


def normalize_email(email: str) -> str:
    """メールアドレスは前後の空白を除き、小文字で扱う"""
    return email.strip().lower()


def find_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """大文字小文字を区別せずにユーザーを探す"""
    return db.query(models.User).filter(
        func.lower(models.User.email) == normalize_email(email)
    ).first()


def normalize_icf_level(icf_level: Optional[str]) -> str:
    level = (icf_level or "none").lower()
    return level if level in VALID_ICF_LEVELS else "none"


def generate_referral_code(db: Session) -> str:
    chars = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = "".join(random.choices(chars, k=8))
        if not db.query(models.User).filter(models.User.referral_code == code).first():
            return code
    raise RuntimeError("紹介コードの生成に失敗しました")


def create_user(
    db: Session,
    *,
    name: str,
    email: str,
    password_hash: Optional[str],
    icf_level: Optional[str],
    referral_code: Optional[str],
    signup_method: str,
    email_verified_at: Optional[datetime] = None,
) -> models.User:
    """ユーザーを作成し、登録ボーナスのクレジットを付ける。

    commit は呼び出し側で行う(Google登録では連携レコードと同じトランザクションにするため)。
    重複メールの確認も呼び出し側の責任。
    """
    referrer = None
    if referral_code:
        referrer = db.query(models.User).filter(
            models.User.referral_code == referral_code
        ).first()

    user = models.User(
        name=name.strip(),
        email=normalize_email(email),
        password_hash=password_hash,
        icf_level=normalize_icf_level(icf_level),
        credits=SIGNUP_BONUS_CREDITS,
        referral_code=generate_referral_code(db),
        referred_by=referrer.id if referrer else None,
        signup_method=signup_method,
        email_verified_at=email_verified_at,
    )
    db.add(user)
    db.flush()

    db.add(models.Credit(user_id=user.id, amount=SIGNUP_BONUS_CREDITS, reason="bonus"))
    return user
