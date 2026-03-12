"""Analyze router: upload audio and run full analysis pipeline"""

import logging
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    session_type: str = Form("initial"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    # [LOG] Step 2: received form parameters
    logger.info(f"[analyze] session_type='{session_type}' file='{file.filename}' user={current_user.email}")

    # Check credits
    if current_user.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="クレジットが不足しています",
        )

    # Validate file extension
    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    if suffix not in (".mp3", ".mp4", ".m4a"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mp3、mp4、m4aファイルのみアップロードできます",
        )

    # Save uploaded file to temp location
    tmp_input = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        content = await file.read()
        tmp_input.write(content)
        tmp_input.close()
        input_path = Path(tmp_input.name)

        # Convert to mp3 if needed
        from modules.converter import convert_to_mp3
        mp3_path, is_temp_mp3 = convert_to_mp3(input_path)

        try:
            # Transcribe
            from modules.transcriber import transcribe
            transcription = transcribe(mp3_path)

            # Analyze
            from modules.analyzer import analyze_session
            is_follow_up = session_type == "follow_up"
            # [LOG] Step 3: values passed to analyzer
            logger.info(f"[analyze] is_follow_up={is_follow_up} (session_type='{session_type}')")
            analysis = analyze_session(transcription["utterances"], is_follow_up=is_follow_up)

            # Generate PDF to temp directory
            with tempfile.TemporaryDirectory() as tmp_dir:
                from modules.reporter import generate_report
                pdf_path = generate_report(
                    analysis=analysis,
                    transcription=transcription,
                    output_dir=Path(tmp_dir),
                )
                pdf_bytes = pdf_path.read_bytes()

            # Compute session metrics
            competencies = analysis.get("competencies", [])
            avg_score = (
                sum(c["score"] for c in competencies) / len(competencies)
                if competencies else 0.0
            )

            total_chars = transcription["coach_word_count"] + transcription["client_word_count"]
            coach_ratio = (
                round(transcription["coach_word_count"] / total_chars * 100)
                if total_chars > 0 else 0
            )

            scores_json = {
                "competencies": competencies,  # markers・fulfillment_rate含む全データ
                "overall_summary": analysis.get("overall_summary", ""),
                "qualification_comment": analysis.get("qualification_comment", ""),
                "strengths_improvements": analysis.get("strengths_improvements"),
                "pcc_fulfillment_rate": analysis.get("pcc_fulfillment_rate", 0.0),
                "mcc_evaluation": analysis.get("mcc_evaluation"),
            }

            # Save session to DB
            session = models.Session(
                user_id=current_user.id,
                duration_seconds=transcription["duration_seconds"],
                coach_ratio=float(coach_ratio),
                avg_score=avg_score,
                scores=scores_json,
                pdf_data=pdf_bytes,
                expires_at=datetime.utcnow() + timedelta(days=180),
            )
            db.add(session)
            db.flush()

            # Deduct 1 credit
            current_user.credits -= 1
            credit_record = models.Credit(
                user_id=current_user.id,
                amount=-1,
                reason="analysis",
            )
            db.add(credit_record)
            db.commit()
            db.refresh(session)

            return schemas.AnalyzeResponse(session_id=session.id, avg_score=avg_score)

        finally:
            # Clean up temp mp3 if it was converted
            if is_temp_mp3 and mp3_path.exists():
                mp3_path.unlink()

    finally:
        # Clean up original upload temp file
        if input_path.exists():
            input_path.unlink()
