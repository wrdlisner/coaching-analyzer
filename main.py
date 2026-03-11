"""ICFコーチングセッション分析ツール - エントリーポイント"""

import sys
from pathlib import Path

import click

from config import ASSEMBLYAI_API_KEY, ANTHROPIC_API_KEY
from modules.converter import convert_to_mp3
from modules.transcriber import transcribe
from modules.analyzer import analyze_session
from modules.reporter import generate_report


@click.command()
@click.option("--input", "input_file", required=True, type=click.Path(exists=True), help="録音ファイル（mp3/mp4/m4a）")
@click.option("--output", "output_dir", default="./output", type=click.Path(), help="出力ディレクトリ")
@click.option("--coach", default="A", help="コーチの話者ラベル（デフォルト: A）")
@click.option("--client", default="B", help="クライアントの話者ラベル（デフォルト: B）")
def main(input_file: str, output_dir: str, coach: str, client: str):
    """ICFコーチングセッション分析ツール"""

    input_path = Path(input_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    css_path = Path(__file__).parent / "templates" / "report_style.css"

    # APIキーチェック
    if not ASSEMBLYAI_API_KEY:
        click.echo("エラー: ASSEMBLYAI_API_KEY が設定されていません。", err=True)
        click.echo(".envファイルまたは環境変数に設定してください。", err=True)
        sys.exit(1)
    if not ANTHROPIC_API_KEY:
        click.echo("エラー: ANTHROPIC_API_KEY が設定されていません。", err=True)
        click.echo(".envファイルまたは環境変数に設定してください。", err=True)
        sys.exit(1)

    temp_file = None

    try:
        # ① ファイル形式チェック・変換
        click.echo(f"[1/4] ファイル形式チェック: {input_path.name}")
        mp3_path, is_temp = convert_to_mp3(input_path)
        if is_temp:
            temp_file = mp3_path
            click.echo(f"       → mp3に変換しました")
        else:
            click.echo(f"       → mp3ファイルです（変換不要）")

        # ② 文字起こし
        click.echo("[2/4] 文字起こし中（AssemblyAI）...")
        transcription = transcribe(mp3_path, coach_label=coach, client_label=client)
        utt_count = len(transcription["utterances"])
        duration_min = int(transcription["duration_seconds"] // 60)
        click.echo(f"       → 完了（{utt_count}発話、約{duration_min}分）")

        # ③ ICFコンピテンシー分析
        click.echo("[3/4] ICFコンピテンシー分析中（Claude API）...")
        analysis = analyze_session(transcription["utterances"])
        avg_score = sum(c["score"] for c in analysis["competencies"]) / len(analysis["competencies"])
        click.echo(f"       → 完了（平均スコア: {avg_score:.1f}/5.0）")

        # ④ PDF生成
        click.echo("[4/4] PDFレポート生成中...")
        report_path = generate_report(
            analysis=analysis,
            transcription=transcription,
            output_dir=output_path,
            css_path=css_path if css_path.exists() else None,
        )
        click.echo(f"       → 完了: {report_path}")

        click.echo("")
        click.echo("分析が完了しました！")

    except Exception as e:
        click.echo(f"\nエラーが発生しました: {e}", err=True)
        sys.exit(1)

    finally:
        # 一時ファイルの削除
        if temp_file and temp_file.exists():
            temp_file.unlink()


if __name__ == "__main__":
    main()
