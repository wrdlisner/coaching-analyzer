"""Notices router: お知らせ取得・既読登録"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api/notices", tags=["notices"])


@router.get("/latest", response_model=Optional[schemas.NoticeResponse])
def get_latest_unread(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """未読の最新お知らせを1件返す（なければnull）"""
    from datetime import datetime, timezone

    read_notice_ids = {
        r.notice_id
        for r in db.query(models.NoticeRead).filter(
            models.NoticeRead.user_id == current_user.id
        ).all()
    }

    now = datetime.now(timezone.utc)
    notice = (
        db.query(models.Notice)
        .filter(
            models.Notice.is_published == True,
            models.Notice.published_at <= now,
            models.Notice.id.notin_(read_notice_ids),
        )
        .order_by(models.Notice.published_at.desc())
        .first()
    )
    return notice


@router.get("/{notice_id}", response_model=schemas.NoticeResponse)
def get_notice(
    notice_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    notice = db.query(models.Notice).filter(
        models.Notice.id == notice_id,
        models.Notice.is_published == True,
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")
    return notice


@router.post("/{notice_id}/read", response_model=schemas.SuccessResponse)
def mark_as_read(
    notice_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """お知らせを既読にする"""
    existing = db.query(models.NoticeRead).filter(
        models.NoticeRead.user_id == current_user.id,
        models.NoticeRead.notice_id == notice_id,
    ).first()
    if not existing:
        read = models.NoticeRead(user_id=current_user.id, notice_id=notice_id)
        db.add(read)
        db.commit()
    return {"success": True}
