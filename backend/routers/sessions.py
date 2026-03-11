"""Sessions router: list, get, download PDF"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=List[schemas.SessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.created_at.desc())
        .all()
    )
    return sessions


@router.get("/{session_id}", response_model=schemas.SessionResponse)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="セッションが見つかりません")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    return session


@router.get("/{session_id}/pdf")
def download_pdf(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="セッションが見つかりません")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    if not session.pdf_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDFが存在しません")

    return Response(
        content=session.pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=coaching_report_{session_id}.pdf"
        },
    )
