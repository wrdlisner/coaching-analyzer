"""Manager 1on1 router: /api/manager/analyze（認証・クレジット不要）"""

import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import Response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manager", tags=["manager"])


@router.post("/analyze")
def analyze_manager_audio(
    file: UploadFile = File(...),
):
    """
    1on1音声ファイルをアップロードし、分析PDFを同期的に返す。
    認証・クレジット不要。DBへの保存なし。
    """
    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    if suffix not in (".mp3", ".mp4", ".m4a"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mp3、mp4、m4aファイルのみアップロードできます",
        )

    content = file.file.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ファイルサイズは500MB以下にしてください",
        )

    mp3_path = None
    is_temp_mp3 = False
    tmp_input_path = None

    try:
        # 一時ファイルに保存
        tmp_input = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp_input.write(content)
        tmp_input.close()
        tmp_input_path = Path(tmp_input.name)

        # mp3変換（必要な場合）
        from modules.converter import convert_to_mp3
        mp3_path, is_temp_mp3 = convert_to_mp3(tmp_input_path)

        # 文字起こし（話者分離：A=マネジャー、B=部下）
        from modules.transcriber import transcribe
        transcription = transcribe(mp3_path)

        # speaker ラベルをマネジャー/部下に変換
        for utt in transcription["utterances"]:
            if utt["speaker"] == "コーチ":
                utt["speaker"] = "マネジャー"
            elif utt["speaker"] == "クライアント":
                utt["speaker"] = "部下"

        # 分析
        from modules.manager_analyzer import analyze_manager_session
        analysis = analyze_manager_session(transcription["utterances"])

        # PDF生成
        with tempfile.TemporaryDirectory() as tmp_dir:
            from modules.manager_reporter import generate_manager_report
            pdf_path = generate_manager_report(
                analysis=analysis,
                transcription=transcription,
                output_dir=Path(tmp_dir),
            )
            pdf_bytes = pdf_path.read_bytes()

        logger.info(f"[manager] analysis completed, pdf_size={len(pdf_bytes)}")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=manager_1on1_report.pdf"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[manager] analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析中にエラーが発生しました: {str(e)}",
        )
    finally:
        if is_temp_mp3 and mp3_path and mp3_path.exists():
            mp3_path.unlink()
        if tmp_input_path and tmp_input_path.exists():
            tmp_input_path.unlink()
