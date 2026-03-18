"""Admin router: user management (admin only)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import List, Optional
from datetime import date, timedelta

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
    counts = dict(
        db.query(models.Session.user_id, func.count(models.Session.id))
        .group_by(models.Session.user_id)
        .all()
    )
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        d = schemas.AdminUserResponse.model_validate(u)
        d.analysis_count = counts.get(u.id, 0)
        result.append(d)
    return result


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


@router.get("/feedbacks", response_model=List[schemas.AdminFeedbackResponse])
def list_feedbacks(
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Feedback, models.User.name, models.User.email)
        .join(models.Session, models.Feedback.session_id == models.Session.id)
        .join(models.User, models.Session.user_id == models.User.id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )
    return [
        schemas.AdminFeedbackResponse(
            id=fb.id,
            session_id=fb.session_id,
            user_name=name,
            user_email=email,
            satisfaction=fb.satisfaction,
            accuracy=fb.accuracy,
            comment=fb.comment,
            created_at=fb.created_at,
        )
        for fb, name, email in rows
    ]


@router.get("/trends", response_model=List[schemas.TrendDataPoint])
def get_trends(
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    today = date.today()
    start = today - timedelta(days=29)

    session_rows = (
        db.query(
            cast(models.Session.created_at, Date).label("day"),
            func.count(models.Session.id).label("cnt"),
            func.avg(models.Session.avg_score).label("avg_score"),
        )
        .filter(models.Session.created_at >= start)
        .group_by(cast(models.Session.created_at, Date))
        .all()
    )
    session_map = {
        str(r.day): {
            "count": r.cnt,
            "avg_score": float(r.avg_score) if r.avg_score is not None else None,
        }
        for r in session_rows
    }

    feedback_rows = (
        db.query(
            cast(models.Feedback.created_at, Date).label("day"),
            func.avg(models.Feedback.satisfaction).label("avg_sat"),
            func.avg(models.Feedback.accuracy).label("avg_acc"),
        )
        .filter(models.Feedback.created_at >= start)
        .group_by(cast(models.Feedback.created_at, Date))
        .all()
    )
    feedback_map = {
        str(r.day): {
            "avg_satisfaction": float(r.avg_sat) if r.avg_sat is not None else None,
            "avg_accuracy": float(r.avg_acc) if r.avg_acc is not None else None,
        }
        for r in feedback_rows
    }

    result = []
    for i in range(30):
        d = str(start + timedelta(days=i))
        s = session_map.get(d, {})
        f = feedback_map.get(d, {})
        result.append(
            schemas.TrendDataPoint(
                date=d,
                analysis_count=s.get("count", 0),
                avg_score=s.get("avg_score"),
                avg_satisfaction=f.get("avg_satisfaction"),
                avg_accuracy=f.get("avg_accuracy"),
            )
        )
    return result


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


# ---- Notices CRUD ----

@router.get("/notices", response_model=List[schemas.NoticeResponse])
def list_notices(
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Notice).order_by(models.Notice.created_at.desc()).all()


@router.post("/notices", response_model=schemas.NoticeResponse)
def create_notice(
    body: schemas.NoticeCreateRequest,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = models.Notice(
        title=body.title,
        body=body.body,
        published_at=body.published_at,
        is_published=body.is_published,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.put("/notices/{notice_id}", response_model=schemas.NoticeResponse)
def update_notice(
    notice_id: str,
    body: schemas.NoticeUpdateRequest,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")
    if body.title is not None:
        notice.title = body.title
    if body.body is not None:
        notice.body = body.body
    if body.published_at is not None:
        notice.published_at = body.published_at
    if body.is_published is not None:
        notice.is_published = body.is_published
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/notices/{notice_id}", response_model=schemas.SuccessResponse)
def delete_notice(
    notice_id: str,
    _admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="お知らせが見つかりません")
    db.delete(notice)
    db.commit()
    return {"success": True}
