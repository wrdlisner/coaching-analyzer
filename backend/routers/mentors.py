"""Mentors router: mentor application, listing, profile, tracking, recommend"""

import base64
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

router = APIRouter(prefix="/api/mentors", tags=["mentors"])

VALID_CREDENTIALS = {"PCC", "MCC"}
VALID_CLIENT_TYPES = {"individual", "corporate", "both"}
VALID_SPECIALTIES = {
    "基盤を示す",
    "コーチングマインドを体現する",
    "合意を確立し維持する",
    "信頼と安全を育む",
    "プレゼンスを維持する",
    "積極的に傾聴する",
    "気づきを呼び起こす",
    "クライアントの成長を促進する",
}


def _validate_mentor_data(data: schemas.MentorApplyRequest | schemas.MentorUpdateRequest) -> None:
    if hasattr(data, "credential") and data.credential is not None:
        if data.credential not in VALID_CREDENTIALS:
            raise HTTPException(status_code=400, detail="credentialはPCCまたはMCCを指定してください")
    if hasattr(data, "client_type") and data.client_type is not None:
        if data.client_type not in VALID_CLIENT_TYPES:
            raise HTTPException(status_code=400, detail="client_typeはindividual/corporate/bothを指定してください")
    if hasattr(data, "specialties") and data.specialties is not None:
        if len(data.specialties) > 3:
            raise HTTPException(status_code=400, detail="specialtiesは最大3つまでです")
        for s in data.specialties:
            if s not in VALID_SPECIALTIES:
                raise HTTPException(status_code=400, detail=f"無効なspecialty: {s}")
    if hasattr(data, "bio") and data.bio is not None:
        if len(data.bio) < 200 or len(data.bio) > 400:
            raise HTTPException(status_code=400, detail="bioは200〜400字で入力してください")


ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    mime = file.content_type or ""
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="jpg/png/webpのみアップロード可能です")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズは5MB以下にしてください")

    # base64 データURLとして返す（サーバーファイル保存不要・デプロイ間で消えない）
    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"
    return {"url": data_url}


@router.post("/apply", response_model=schemas.SuccessResponse)
def apply_mentor(
    body: schemas.MentorApplyRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.mentor_status not in ("none", "rejected"):
        raise HTTPException(status_code=400, detail="既に申請済みまたは承認済みです")

    _validate_mentor_data(body)

    existing = db.query(models.Mentor).filter(models.Mentor.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.flush()

    mentor = models.Mentor(
        user_id=current_user.id,
        display_name=body.display_name,
        credential=body.credential,
        coaching_years=body.coaching_years,
        bio=body.bio,
        photo_url=body.photo_url,
        specialties=body.specialties,
        client_type=body.client_type,
        style_note=body.style_note,
        contact_url=body.contact_url,
        sns_url=body.sns_url,
        is_active=False,
    )
    db.add(mentor)
    current_user.mentor_status = "pending"
    db.commit()
    return {"success": True}


@router.get("/me", response_model=schemas.MentorResponse)
def get_my_mentor_profile(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    mentor = db.query(models.Mentor).filter(models.Mentor.user_id == current_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")
    return mentor


@router.get("/recommend", response_model=List[schemas.MentorResponse])
def recommend_mentors(
    competencies: str = Query(..., description="カンマ区切りのコンピテンシー名"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    comp_list = [c.strip() for c in competencies.split(",") if c.strip()]
    mentors = db.query(models.Mentor).filter(models.Mentor.is_active == True).all()

    def score(m: models.Mentor) -> int:
        return sum(1 for c in comp_list if c in (m.specialties or []))

    matched = sorted([m for m in mentors if score(m) > 0], key=score, reverse=True)[:3]
    if len(matched) < 3:
        remaining = [m for m in mentors if m not in matched][:3 - len(matched)]
        matched += remaining
    return matched


@router.get("", response_model=List[schemas.MentorResponse])
def list_mentors(
    credential: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    q = db.query(models.Mentor).filter(models.Mentor.is_active == True)
    if credential:
        q = q.filter(models.Mentor.credential == credential)
    if specialty:
        q = q.filter(models.Mentor.specialties.contains([specialty]))
    return q.order_by(models.Mentor.created_at.desc()).all()


@router.get("/{mentor_id}", response_model=schemas.MentorResponse)
def get_mentor(
    mentor_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    mentor = db.query(models.Mentor).filter(
        models.Mentor.id == mentor_id,
        models.Mentor.is_active == True,
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="メンターが見つかりません")
    return mentor


@router.patch("/profile", response_model=schemas.MentorResponse)
def update_mentor_profile(
    body: schemas.MentorUpdateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "mentor":
        raise HTTPException(status_code=403, detail="メンター権限が必要です")

    mentor = db.query(models.Mentor).filter(models.Mentor.user_id == current_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")

    _validate_mentor_data(body)

    if body.display_name is not None:
        mentor.display_name = body.display_name
    if body.credential is not None:
        mentor.credential = body.credential
    if body.coaching_years is not None:
        mentor.coaching_years = body.coaching_years
    if body.bio is not None:
        mentor.bio = body.bio
    if body.photo_url is not None:
        mentor.photo_url = body.photo_url
    if body.specialties is not None:
        mentor.specialties = body.specialties
    if body.client_type is not None:
        mentor.client_type = body.client_type
    if body.style_note is not None:
        mentor.style_note = body.style_note
    if body.contact_url is not None:
        mentor.contact_url = body.contact_url
    if body.sns_url is not None:
        mentor.sns_url = body.sns_url

    mentor.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(mentor)
    return mentor


@router.post("/track/view", response_model=schemas.SuccessResponse)
def track_view(
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    return {"success": True}


@router.post("/{mentor_id}/track/click", response_model=schemas.SuccessResponse)
def track_click(
    mentor_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    mentor = db.query(models.Mentor).filter(models.Mentor.id == mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="メンターが見つかりません")
    mentor.click_count += 1
    db.commit()
    return {"success": True}
