"""AssemblyAI 文字起こしモジュール"""

import logging
from pathlib import Path

import assemblyai as aai

from config import ASSEMBLYAI_API_KEY

logger = logging.getLogger(__name__)


def _delete_remote_transcript(transcript) -> None:
    """AssemblyAI側に残る音声・文字起こしを削除する（失敗しても分析は止めない）"""
    transcript_id = getattr(transcript, "id", None)
    if not transcript_id:
        return
    try:
        aai.Transcript.delete_by_id(transcript_id)
        logger.info(f"[transcriber] AssemblyAI transcript deleted: {transcript_id}")
    except Exception as e:
        logger.warning(f"[transcriber] AssemblyAI transcript delete failed: {transcript_id} ({e})")


def transcribe(audio_path: Path, coach_label: str = "A", client_label: str = "B") -> dict:
    """
    AssemblyAIで文字起こし＋話者分離を行う。

    Returns:
        {
            "utterances": [
                {"speaker": "コーチ", "text": "...", "start": 0, "end": 1000},
                ...
            ],
            "duration_seconds": float,
            "coach_word_count": int,
            "client_word_count": int,
        }
    """
    aai.settings.api_key = ASSEMBLYAI_API_KEY

    config = aai.TranscriptionConfig(
        speech_models=["universal-2"],
        language_code="ja",
        speaker_labels=True,
    )

    transcriber = aai.Transcriber()
    transcript = transcriber.transcribe(str(audio_path), config=config)

    try:
        return _build_result(transcript, coach_label, client_label)
    finally:
        # 結果を手元に取り出した後、AssemblyAI側の音声・文字起こしを削除（失敗時も削除）
        _delete_remote_transcript(transcript)


def _build_result(transcript, coach_label: str, client_label: str) -> dict:
    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(f"文字起こしに失敗しました: {transcript.error}")

    speaker_map = {
        f"A": coach_label,
        f"B": client_label,
    }

    utterances = []
    coach_word_count = 0
    client_word_count = 0

    for utt in transcript.utterances:
        speaker_key = utt.speaker  # "A", "B", etc.
        role = "コーチ" if speaker_map.get(speaker_key) == coach_label else "クライアント"
        word_count = len(utt.text)

        if role == "コーチ":
            coach_word_count += word_count
        else:
            client_word_count += word_count

        utterances.append({
            "speaker": role,
            "text": utt.text,
            "start": utt.start,
            "end": utt.end,
        })

    duration_ms = transcript.utterances[-1].end if transcript.utterances else 0

    return {
        "utterances": utterances,
        "duration_seconds": duration_ms / 1000,
        "coach_word_count": coach_word_count,
        "client_word_count": client_word_count,
    }


def format_timestamp(ms: int) -> str:
    """ミリ秒を mm:ss 形式に変換"""
    total_seconds = ms // 1000
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"
