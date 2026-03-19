"""Analyze router: upload audio and run full analysis pipeline (async job)"""

import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import models
import schemas
import auth as auth_utils
from database import get_db, SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analyze"])


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _run_analysis(job_id: UUID, user_id: UUID, input_path: Path, suffix: str, session_type: str):
    """バックグラウンドで分析パイプラインを実行する"""
    db = SessionLocal()
    mp3_path = None
    is_temp_mp3 = False

    try:
        # ジョブを processing に更新
        job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == job_id).first()
        if not job:
            return
        job.status = "processing"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Convert to mp3 if needed
        from modules.converter import convert_to_mp3
        mp3_path, is_temp_mp3 = convert_to_mp3(input_path)

        # Transcribe
        from modules.transcriber import transcribe
        transcription = transcribe(mp3_path)

        # Analyze
        from modules.analyzer import analyze_session
        is_follow_up = session_type == "follow_up"
        analysis = analyze_session(transcription["utterances"], is_follow_up=is_follow_up)

        # Generate PDF
        with tempfile.TemporaryDirectory() as tmp_dir:
            from modules.reporter import generate_report
            pdf_path = generate_report(
                analysis=analysis,
                transcription=transcription,
                output_dir=Path(tmp_dir),
            )
            pdf_bytes = pdf_path.read_bytes()

        # Compute metrics
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
            "competencies": competencies,
            "overall_summary": analysis.get("overall_summary", ""),
            "qualification_comment": analysis.get("qualification_comment", ""),
            "strengths_improvements": analysis.get("strengths_improvements"),
            "pcc_fulfillment_rate": analysis.get("pcc_fulfillment_rate", 0.0),
            "mcc_evaluation": analysis.get("mcc_evaluation"),
        }

        # Save session
        user = db.query(models.User).filter(models.User.id == user_id).first()
        session = models.Session(
            user_id=user_id,
            duration_seconds=transcription["duration_seconds"],
            coach_ratio=float(coach_ratio),
            avg_score=avg_score,
            scores=scores_json,
            pdf_data=pdf_bytes,
            expires_at=datetime.now(timezone.utc) + timedelta(days=180),
        )
        db.add(session)
        db.flush()

        # Deduct 1 credit
        user.credits -= 1
        credit_record = models.Credit(
            user_id=user_id,
            amount=-1,
            reason="analysis",
        )
        db.add(credit_record)

        # ジョブを completed に更新
        job.status = "completed"
        job.session_id = session.id
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(f"[job {job_id}] completed: session_id={session.id}")

    except Exception as e:
        logger.error(f"[job {job_id}] failed: {e}", exc_info=True)
        try:
            job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
        # クリーンアップ
        if is_temp_mp3 and mp3_path and mp3_path.exists():
            mp3_path.unlink()
        if input_path.exists():
            input_path.unlink()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=schemas.JobAcceptedResponse, status_code=202)
async def analyze_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_type: str = Form("initial"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    logger.info(f"[analyze] session_type='{session_type}' file='{file.filename}' user={current_user.email}")

    # クレジット確認
    if current_user.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="クレジットが不足しています",
        )

    # 拡張子チェック
    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    if suffix not in (".mp3", ".mp4", ".m4a"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mp3、mp4、m4aファイルのみアップロードできます",
        )

    # アップロードファイルを永続的な一時ファイルに保存
    tmp_input = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    content = await file.read()
    tmp_input.write(content)
    tmp_input.close()
    input_path = Path(tmp_input.name)

    # ジョブをDBに登録
    job = models.AnalysisJob(user_id=current_user.id, status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)

    # バックグラウンドタスクとして分析を起動
    background_tasks.add_task(
        _run_analysis,
        job_id=job.id,
        user_id=current_user.id,
        input_path=input_path,
        suffix=suffix,
        session_type=session_type,
    )

    logger.info(f"[analyze] job {job.id} queued")
    return schemas.JobAcceptedResponse(job_id=job.id)


@router.get("/analyze/status/{job_id}", response_model=schemas.JobStatusResponse)
def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    job = db.query(models.AnalysisJob).filter(
        models.AnalysisJob.id == job_id,
        models.AnalysisJob.user_id == current_user.id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")

    return schemas.JobStatusResponse(
        job_id=job.id,
        status=job.status,
        session_id=job.session_id,
        error_message=job.error_message,
    )
