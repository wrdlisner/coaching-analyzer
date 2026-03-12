"""mp4/m4a → mp3 変換モジュール（ffmpeg使用）"""

import subprocess
import tempfile
from pathlib import Path


def convert_to_mp3(input_path: Path) -> tuple[Path, bool]:
    """
    入力ファイルがmp4/m4aの場合、mp3に変換する。
    mp3の場合はそのまま返す。

    Returns:
        (mp3ファイルパス, 一時ファイルかどうか)
    """
    suffix = input_path.suffix.lower()

    if suffix == ".mp3":
        return input_path, False

    if suffix not in (".mp4", ".m4a"):
        raise ValueError(f"未対応のファイル形式です: {suffix}")

    # 一時ファイルとしてmp3を作成
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp.close()
    output_path = Path(tmp.name)

    cmd = [
        "ffmpeg", "-i", str(input_path),
        "-q:a", "0", "-map", "a",
        "-y", str(output_path),
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        raise RuntimeError("ffmpegがインストールされていません。インストールしてください。")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg変換に失敗しました: {e.stderr}")

    return output_path, True
