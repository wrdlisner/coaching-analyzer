"""Create or promote an admin user.

Usage:
  python seed_admin.py                          # creates default admin
  python seed_admin.py admin@example.com pass   # specify email and password
  python seed_admin.py --promote user@example.com  # promote existing user
"""

import sys
from database import SessionLocal
import models
import auth as auth_utils

db = SessionLocal()


def promote_existing(email: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print(f"[ERROR] ユーザーが見つかりません: {email}")
        sys.exit(1)
    user.is_admin = True
    db.commit()
    print(f"[OK] 管理者に昇格しました: {email}")


def create_admin(email: str, password: str, name: str = "管理者"):
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        if not existing.is_admin:
            existing.is_admin = True
            db.commit()
            print(f"[OK] 既存ユーザーを管理者に昇格しました: {email}")
        else:
            print(f"[INFO] すでに管理者です: {email}")
        return

    user = models.User(
        name=name,
        email=email,
        password_hash=auth_utils.hash_password(password),
        icf_level="none",
        credits=0,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    print(f"[OK] 管理者を作成しました: {email}")


if __name__ == "__main__":
    args = sys.argv[1:]

    if args and args[0] == "--promote":
        if len(args) < 2:
            print("使い方: python seed_admin.py --promote <email>")
            sys.exit(1)
        promote_existing(args[1])
    elif len(args) >= 2:
        create_admin(email=args[0], password=args[1])
    elif len(args) == 1:
        create_admin(email=args[0], password="admin1234")
    else:
        create_admin(email="admin@example.com", password="admin1234")

    db.close()
