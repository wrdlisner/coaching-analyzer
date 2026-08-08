"""PDF レポート生成モジュール（fpdf2 + matplotlib）"""

import base64
import io
import math
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from fpdf import FPDF

from modules.analyzer import get_qualification_statuses, COMP_NAMES
from modules.transcriber import format_timestamp

# フォントファイルパス（IPA フォントを優先、なければプロジェクトルートの Meiryo を使用）
_IPA_REGULAR = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
_IPA_BOLD = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
_PROJECT_ROOT = Path(__file__).parent.parent
_MEIRYO_REGULAR = str(_PROJECT_ROOT / "meiryo_regular.ttf")
_MEIRYO_BOLD = str(_PROJECT_ROOT / "meiryo_bold.ttf")

if Path(_IPA_REGULAR).exists():
    _FONT_REGULAR = _IPA_REGULAR
    _FONT_BOLD = _IPA_BOLD
else:
    _FONT_REGULAR = _MEIRYO_REGULAR
    _FONT_BOLD = _MEIRYO_BOLD

# matplotlib 用フォント登録
try:
    fm.fontManager.addfont(_FONT_REGULAR)
    _MPL_FONT = fm.FontProperties(fname=_FONT_REGULAR).get_name()
except Exception:
    _MPL_FONT = "sans-serif"


def _generate_radar_chart_png(competencies: list[dict]) -> bytes:
    """ICFコンピテンシーのレーダーチャートをPNGバイト列で生成"""
    labels = [c["name"] for c in competencies]
    scores = [c["score"] for c in competencies]

    n = len(labels)
    angles = np.linspace(0, 2 * np.pi, n, endpoint=False).tolist()
    scores_plot = scores + [scores[0]]
    angles += [angles[0]]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(["1", "2", "3", "4", "5"], fontsize=8, color="#999")

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, fontsize=9, fontfamily=_MPL_FONT)

    ax.plot(angles, scores_plot, "o-", linewidth=2, color="#3b82f6")
    ax.fill(angles, scores_plot, alpha=0.25, color="#3b82f6")

    ax.set_title("ICFコンピテンシー別スコア", fontsize=14, fontfamily=_MPL_FONT, pad=20)
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


class CoachingReportPDF(FPDF):
    """コーチングレポート用PDF"""

    def __init__(self):
        super().__init__()
        self.add_font("Meiryo", "", _FONT_REGULAR)
        self.add_font("MeiryoBold", "", _FONT_BOLD)
        self.set_auto_page_break(auto=True, margin=20)

    def _set_font_regular(self, size=10):
        self.set_font("Meiryo", size=size)

    def _set_font_bold(self, size=10):
        self.set_font("MeiryoBold", size=size)

    def header(self):
        pass

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self._set_font_regular(8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 10, f"- {self.page_no()} -", align="C")
            self.set_text_color(0, 0, 0)

    def ai_notice_section(self):
        """AI評価である旨の注意文ボックスをライトグレー背景で挿入"""
        self.add_page()
        self.ln(4)
        self.set_fill_color(240, 240, 240)
        self.set_draw_color(180, 180, 180)
        self.set_line_width(0.3)

        notice_lines = [
            "！ 注意事項",
            "本レポートはAI（Claude）によって自動的に評価・作成されています。",
            "ICFコアコンピテンシーに基づいた参考情報としてご活用ください。",
            "評価結果は絶対的なものではなく、メンターコーチや資格審査員による",
            "判断を代替するものではありません。",
        ]

        # ボックス全体の高さを先に計算して rect で描画
        line_h = 7
        padding_v = 6
        box_h = padding_v * 2 + line_h * len(notice_lines)
        x = self.l_margin
        y = self.get_y()
        w = self.w - self.l_margin - self.r_margin
        self.rect(x, y, w, box_h, style="FD")

        self.set_y(y + padding_v)
        for i, line in enumerate(notice_lines):
            self.set_x(x + 4)
            if i == 0:
                self._set_font_bold(11)
                self.set_text_color(80, 80, 80)
            else:
                self._set_font_regular(10)
                self.set_text_color(60, 60, 60)
            self.cell(w - 8, line_h, line, new_x="LMARGIN", new_y="NEXT")

        self.set_text_color(0, 0, 0)
        self.set_draw_color(0, 0, 0)
        self.ln(6)

    def deep_dive_section(self, deep_dive: dict):
        """ディープ分析だけに含まれる「総合考察」セクション。
        通常分析には存在しない章として、セッション全体を俯瞰した
        根本パターン・重点テーマ・練習プランを示す。"""
        self.add_page()
        w = self.w - self.l_margin - self.r_margin

        # 紫のタイトル（ディープ専用であることを視覚的に強調）
        self._set_font_bold(14)
        self.set_text_color(91, 33, 182)
        self.cell(0, 10, "ディープ分析による総合考察", new_x="LEFT", new_y="NEXT")
        self.set_draw_color(124, 58, 237)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

        self._set_font_regular(9)
        self.set_text_color(124, 58, 237)
        self.multi_cell(w, 5, "※ この考察は通常分析には含まれない、ディープ分析だけの総合的な深掘りです。")
        self.ln(3)
        self.set_draw_color(0, 0, 0)

        # 1. 根本パターン
        core = deep_dive.get("core_patterns")
        if core:
            self._set_font_bold(11)
            self.set_text_color(45, 55, 72)
            self.cell(0, 8, "セッション全体を貫くパターン", new_x="LEFT", new_y="NEXT")
            self._set_font_regular(10)
            self.set_text_color(51, 51, 51)
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, core)
            self.ln(3)

        # 2. 重点テーマ
        theme = deep_dive.get("focus_theme") or {}
        if theme.get("title") or theme.get("detail"):
            self._set_font_bold(11)
            self.set_text_color(45, 55, 72)
            self.cell(0, 8, "いま最も伸ばすべき重点テーマ", new_x="LEFT", new_y="NEXT")
            if theme.get("title"):
                self.set_fill_color(243, 240, 255)
                self._set_font_bold(11)
                self.set_text_color(91, 33, 182)
                self.set_x(self.l_margin)
                self.multi_cell(w, 8, "  " + theme["title"], fill=True)
                self.ln(1)
            if theme.get("detail"):
                self._set_font_regular(10)
                self.set_text_color(51, 51, 51)
                self.set_x(self.l_margin)
                self.multi_cell(w, 6, theme["detail"])
            self.ln(3)

        # 3. 練習ステップ
        steps = deep_dive.get("practice_steps") or []
        if steps:
            self._set_font_bold(11)
            self.set_text_color(45, 55, 72)
            self.cell(0, 8, "次のセッションで試す練習ステップ", new_x="LEFT", new_y="NEXT")
            self._set_font_regular(10)
            self.set_text_color(51, 51, 51)
            for i, step in enumerate(steps, 1):
                self.set_x(self.l_margin)
                self.multi_cell(w, 6, f"  {i}. {step}")
            self.ln(2)

        self.set_text_color(0, 0, 0)
        self.set_draw_color(0, 0, 0)

    def cover_page(self, analysis_date: datetime, duration_min: int, duration_sec: int, engine_label: str | None = None):
        self.add_page()
        self.ln(60)

        self._set_font_bold(26)
        self.set_text_color(26, 54, 93)
        self.cell(0, 14, "ICFコーチングセッション", align="C", new_x="LEFT", new_y="NEXT")
        self.cell(0, 14, "分析レポート", align="C", new_x="LEFT", new_y="NEXT")

        self.ln(20)

        self._set_font_regular(12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"分析日時: {analysis_date.strftime('%Y年%m月%d日 %H:%M')} (UTC)", align="C", new_x="LEFT", new_y="NEXT")
        self.cell(0, 8, f"セッション時間: {duration_min}分{duration_sec}秒", align="C", new_x="LEFT", new_y="NEXT")

        if engine_label:
            self.ln(4)
            self._set_font_regular(10)
            self.set_text_color(130, 130, 130)
            self.cell(0, 8, f"評価モード・エンジン: {engine_label}", align="C", new_x="LEFT", new_y="NEXT")

        self.set_text_color(0, 0, 0)

    def diff_comment_section(self, diff_text: str, prev_date_label: str | None = None):
        """前回からの差分コメント（分析結果の冒頭に表示）"""
        w = self.w - self.l_margin - self.r_margin
        title = "前回からの変化" + (f"（{prev_date_label}の分析より）" if prev_date_label else "")
        self.set_fill_color(230, 246, 240)
        self._set_font_bold(11)
        self.set_text_color(29, 122, 94)
        self.set_x(self.l_margin)
        self.multi_cell(w, 8, f"  {title}", fill=True)
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        self.set_x(self.l_margin)
        self.multi_cell(w, 6, diff_text, fill=True)
        self.ln(4)
        self.set_text_color(0, 0, 0)

    def section_title(self, title: str):
        self._set_font_bold(14)
        self.set_text_color(26, 54, 93)
        self.cell(0, 10, title, new_x="LEFT", new_y="NEXT")
        # 青い下線
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)
        self.set_text_color(0, 0, 0)
        self.set_draw_color(0, 0, 0)

    def overview_section(self, duration_min, duration_sec, coach_ratio, client_ratio, avg_score, overall_summary, qualification_statuses=None, qualification_comment=None):
        self.add_page()
        self.section_title("1. セッション概要")
        self.ln(2)

        # テーブル
        col_w = [70, 100]
        rows = [
            ("総時間", f"{duration_min}分{duration_sec}秒"),
            ("コーチ発話比率", f"{coach_ratio}%"),
            ("クライアント発話比率", f"{client_ratio}%"),
            ("平均スコア", f"{avg_score:.1f} / 5.0"),
        ]

        self._set_font_regular(10)
        for label, value in rows:
            self.set_x(self.l_margin)
            self.set_fill_color(247, 250, 252)
            self._set_font_bold(10)
            self.cell(col_w[0], 10, f"  {label}", border=1, fill=True)
            self._set_font_regular(10)
            self.cell(col_w[1], 10, f"  {value}", border=1, new_x="LMARGIN", new_y="NEXT")

        self.ln(6)

        # ICF資格別参考スコア水準
        if qualification_statuses:
            self._set_font_bold(11)
            self.set_text_color(26, 54, 93)
            self.cell(0, 8, "ICF資格別 参考スコア水準（AI判定）", new_x="LEFT", new_y="NEXT")

            self._set_font_regular(10)
            self.set_text_color(51, 51, 51)
            for qs in qualification_statuses:
                line = f"{qs['icon']} {qs['name']}（参考基準スコア {qs['threshold']}）：{qs['label']}"
                self.set_x(self.l_margin + 4)
                self.cell(0, 7, line, new_x="LMARGIN", new_y="NEXT")

            # 免責注釈
            self.ln(1)
            self._set_font_regular(8)
            self.set_text_color(120, 120, 120)
            self.set_x(self.l_margin + 4)
            self.multi_cell(
                self.w - self.l_margin - self.r_margin - 4,
                5,
                "※ AIによる参考判定です。ICF公式審査の合否を保証するものではありません。",
            )

            if qualification_comment:
                self.ln(2)
                self._set_font_regular(9)
                self.set_text_color(80, 80, 80)
                self.set_x(self.l_margin + 4)
                self.multi_cell(self.w - self.l_margin - self.r_margin - 4, 6, qualification_comment)

            self.set_text_color(0, 0, 0)

        self.ln(6)

        # 全体総評
        self.set_fill_color(240, 247, 255)
        self.set_draw_color(59, 130, 246)
        x = self.get_x()
        y = self.get_y()

        self._set_font_bold(12)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "全体総評", new_x="LEFT", new_y="NEXT")
        self.set_text_color(51, 51, 51)
        self._set_font_regular(10)
        self.multi_cell(0, 6, overall_summary)
        self.ln(4)
        self.set_draw_color(0, 0, 0)

    def radar_chart_section(self, chart_png: bytes):
        self.add_page()
        self.section_title("2. ICFコンピテンシー別スコア")
        self.ln(5)

        # 画像を中央に配置
        img_w = 130
        x = (self.w - img_w) / 2
        self.image(io.BytesIO(chart_png), x=x, w=img_w)

    def competency_detail_section(self, competencies: list[dict]):
        self.add_page()
        self.section_title("3. コンピテンシー別詳細分析")
        self.ln(2)

        for comp in competencies:
            # ページ残り確認（少なければ改ページ）
            if self.get_y() > 220:
                self.add_page()

            # コンピテンシー名
            self._set_font_bold(12)
            self.set_text_color(45, 55, 72)
            self.cell(0, 8, f"{comp['id']}. {comp['name']}", new_x="LEFT", new_y="NEXT")

            # スコア
            self._set_font_bold(18)
            self.set_text_color(59, 130, 246)
            score_text = f"{comp['score']}"
            self.cell(15, 10, score_text)
            self._set_font_regular(10)
            self.set_text_color(150, 150, 150)
            self.cell(15, 10, "/ 5")
            # 星
            stars = "★" * round(comp["score"]) + "☆" * (5 - round(comp["score"]))
            self.set_text_color(59, 130, 246)
            self._set_font_regular(12)
            self.cell(0, 10, stars, new_x="LEFT", new_y="NEXT")

            self.set_text_color(51, 51, 51)

            # 評価コメント
            self._set_font_regular(10)
            self.set_x(self.l_margin)
            w = self.w - self.l_margin - self.r_margin
            self.multi_cell(w, 6, comp["comment"])
            self.ln(2)

            # 根拠となる発言
            self._set_font_bold(9)
            self.set_text_color(74, 85, 104)
            self.set_x(self.l_margin)
            self.cell(w, 6, "根拠となる発言", new_x="LEFT", new_y="NEXT")
            self._set_font_regular(9)
            self.set_text_color(51, 51, 51)
            for q in comp.get("quotes", []):
                self.set_x(self.l_margin)
                self.multi_cell(w, 5, "  " + q)
            self.ln(2)

            # 改善提案
            self._set_font_bold(9)
            self.set_text_color(74, 85, 104)
            self.set_x(self.l_margin)
            self.cell(w, 6, "改善提案", new_x="LEFT", new_y="NEXT")
            self._set_font_regular(9)
            self.set_text_color(51, 51, 51)
            for imp in comp.get("improvements", []):
                self.set_x(self.l_margin)
                if isinstance(imp, dict):
                    # 3層構造（v4以降）
                    self._set_font_bold(9)
                    self.set_text_color(45, 55, 72)
                    self.multi_cell(w, 5, "  【改善提案】")
                    self._set_font_regular(9)
                    self.set_text_color(51, 51, 51)
                    self.set_x(self.l_margin)
                    self.multi_cell(w, 5, "  " + imp.get("proposal", ""))
                    self.set_x(self.l_margin)
                    self._set_font_bold(9)
                    self.set_text_color(45, 55, 72)
                    self.multi_cell(w, 5, "  【メンター視点からの具体的アドバイス】")
                    self._set_font_regular(9)
                    self.set_text_color(51, 51, 51)
                    self.set_x(self.l_margin)
                    self.multi_cell(w, 5, "  " + imp.get("mentor_advice", ""))
                    self.set_x(self.l_margin)
                    self._set_font_bold(9)
                    self.set_text_color(45, 55, 72)
                    self.multi_cell(w, 5, "  【次のセッションで試せること】")
                    self._set_font_regular(9)
                    self.set_text_color(51, 51, 51)
                    self.set_x(self.l_margin)
                    self.multi_cell(w, 5, "  " + imp.get("next_action", ""))
                    self.ln(2)
                else:
                    # 旧形式（後方互換）
                    self.multi_cell(w, 5, "  " + imp)

            self.ln(6)

            # 区切り線
            self.set_draw_color(226, 232, 240)
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(4)
            self.set_draw_color(0, 0, 0)

    def strengths_improvements_section(self, strengths_improvements: dict):
        """コーチの強み・改善点セクション"""
        self.add_page()
        self.section_title("4. コーチの強み・改善点")
        self.ln(2)

        w = self.w - self.l_margin - self.r_margin

        # 強み
        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【強み】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        for item in strengths_improvements.get("strengths", []):
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, f"・{item}")
        self.ln(4)

        # 改善点
        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【改善点】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        for item in strengths_improvements.get("improvements", []):
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, f"・{item}")
        self.ln(4)

        # 総合コメント
        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【総合コメント】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        self.set_x(self.l_margin)
        self.multi_cell(w, 6, strengths_improvements.get("overall_comment", ""))
        self.set_text_color(0, 0, 0)

    def transcript_section(self, utterances: list[dict]):
        self.add_page()
        self.section_title("4. 文字起こし全文")
        self.ln(2)

        self._set_font_regular(8)
        for utt in utterances:
            if self.get_y() > 270:
                self.add_page()
                self._set_font_regular(8)

            ts = format_timestamp(utt["start"])
            speaker = utt["speaker"]

            if speaker == "コーチ":
                self.set_fill_color(232, 240, 254)
            else:
                self.set_fill_color(254, 249, 231)

            line = f"[{ts}] {speaker}: {utt['text']}"
            self.multi_cell(0, 4, line, fill=True)
            self.ln(1)


def generate_report(
    analysis: dict,
    transcription: dict,
    output_dir: Path,
    css_path: Path | None = None,
    engine_label: str | None = None,
    diff_comment: str | None = None,
    prev_date_label: str | None = None,
) -> Path:
    now = datetime.now(timezone.utc)
    filename = f"coaching_report_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = output_dir / filename

    duration = transcription["duration_seconds"]
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)

    total_chars = transcription["coach_word_count"] + transcription["client_word_count"]
    coach_ratio = (
        round(transcription["coach_word_count"] / total_chars * 100)
        if total_chars > 0
        else 0
    )
    client_ratio = 100 - coach_ratio

    competencies = analysis["competencies"]
    raw_avg = sum(c["score"] for c in competencies) / len(competencies)
    avg_score = math.floor(raw_avg * 10 + 0.5) / 10  # 四捨五入（JS toFixed(1) と同じ挙動）
    qualification_statuses = get_qualification_statuses(
        avg_score,
        analysis.get("pcc_fulfillment_rate", 0.0),
        analysis.get("mcc_avg_score"),
    )

    chart_png = _generate_radar_chart_png(competencies)

    pdf = CoachingReportPDF()

    # 表紙
    pdf.cover_page(now, duration_min, duration_sec, engine_label=engine_label)

    # ⚠️ AI注意文
    pdf.ai_notice_section()

    # 前回からの差分コメント（2回目以降の分析のみ）
    if diff_comment:
        pdf.diff_comment_section(diff_comment, prev_date_label)

    # 1. セッション概要（合格可能性表示を含む）
    pdf.overview_section(
        duration_min, duration_sec,
        coach_ratio, client_ratio, avg_score,
        analysis.get("overall_summary", ""),
        qualification_statuses=qualification_statuses,
        qualification_comment=analysis.get("qualification_comment"),
    )

    # ディープ分析の総合考察（ディープ分析時のみ存在）
    deep_dive = analysis.get("deep_dive")
    if deep_dive:
        pdf.deep_dive_section(deep_dive)

    # 2. レーダーチャート
    pdf.radar_chart_section(chart_png)

    # 3. コンピテンシー別詳細
    pdf.competency_detail_section(competencies)

    # 4. コーチの強み・改善点
    strengths_improvements = analysis.get("strengths_improvements")
    if strengths_improvements:
        pdf.strengths_improvements_section(strengths_improvements)

    pdf.output(str(output_path))

    return output_path


# ---------------------------------------------------------------------------
# 成長記録PDF（プロフィール > 成長記録PDF出力）
# 用途: メンターコーチとの勉強会持参・共有（引き継ぎ書§2-F）
# ---------------------------------------------------------------------------

def _generate_growth_trend_png(sessions_data: list[dict]) -> bytes:
    """平均スコア推移の折れ線PNG（実時間軸）を生成する。sessions_dataは古い順"""
    dates = [s["created_at"] for s in sessions_data]
    scores = [s["avg_score"] for s in sessions_data]

    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(dates, scores, "o-", color="#534AB7", linewidth=2)
    ax.set_ylim(0, 5)
    ax.set_yticks([0, 1, 2, 3, 4, 5])
    ax.grid(True, alpha=0.3)
    ax.set_title("平均スコア推移（5.0満点）", fontsize=12, fontfamily=_MPL_FONT)
    for label in ax.get_xticklabels():
        label.set_fontsize(8)
        label.set_rotation(30)
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _avg_by_competency(sessions_slice: list[dict]) -> dict[int, float | None]:
    """セッション群からコンピテンシー別の平均スコア（小数1桁）を算出する"""
    sums: dict[int, list[float]] = {}
    for s in sessions_slice:
        for c in (s.get("scores") or {}).get("competencies") or []:
            cid = c.get("id")
            score = c.get("score")
            if isinstance(cid, int) and isinstance(score, (int, float)):
                sums.setdefault(cid, []).append(float(score))
    return {
        cid: (math.floor(sum(v) / len(v) * 10 + 0.5) / 10 if v else None)
        for cid, v in sums.items()
    }


def generate_growth_report(
    user_name: str,
    sessions_data: list[dict],
    insight: dict | None,
    output_dir: Path,
    engine_label: str | None = None,
) -> Path:
    """成長記録PDFを生成する。

    sessions_data: [{"created_at": datetime, "avg_score": float, "scores": dict}, ...]（古い順）
    insight: user_insights (kind='profile') の payload（無ければAIコメント章をスキップ）
    """
    now = datetime.now(timezone.utc)
    filename = f"growth_report_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = output_dir / filename

    first_date = sessions_data[0]["created_at"]
    last_date = sessions_data[-1]["created_at"]

    pdf = CoachingReportPDF()

    # 表紙
    pdf.add_page()
    pdf.ln(60)
    pdf._set_font_bold(26)
    pdf.set_text_color(26, 54, 93)
    pdf.cell(0, 14, "コーチング成長記録レポート", align="C", new_x="LEFT", new_y="NEXT")
    pdf.ln(16)
    pdf._set_font_regular(13)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 9, f"{user_name} さん", align="C", new_x="LEFT", new_y="NEXT")
    pdf._set_font_regular(11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"対象期間: {first_date.strftime('%Y年%m月%d日')} 〜 {last_date.strftime('%Y年%m月%d日')}", align="C", new_x="LEFT", new_y="NEXT")
    pdf.cell(0, 8, f"分析回数: {len(sessions_data)}回 ／ 作成日: {now.strftime('%Y年%m月%d日')}", align="C", new_x="LEFT", new_y="NEXT")
    if engine_label:
        pdf.ln(2)
        pdf._set_font_regular(9)
        pdf.set_text_color(130, 130, 130)
        pdf.cell(0, 7, f"現在の評価モード・エンジン: {engine_label}", align="C", new_x="LEFT", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    # AI注意文（分析レポートと共通）
    pdf.ai_notice_section()

    # 1. 推移サマリー
    pdf.section_title("1. スコア推移サマリー")
    pdf.ln(2)
    first_avg = sessions_data[0]["avg_score"]
    last_avg = sessions_data[-1]["avg_score"]
    col_w = [70, 100]
    rows = [
        ("分析回数", f"{len(sessions_data)}回"),
        ("初回の平均スコア", f"{first_avg:.1f} / 5.0"),
        ("直近の平均スコア", f"{last_avg:.1f} / 5.0"),
        ("変化", f"{last_avg - first_avg:+.1f}"),
    ]
    pdf._set_font_regular(10)
    for label, value in rows:
        pdf.set_x(pdf.l_margin)
        pdf.set_fill_color(247, 250, 252)
        pdf._set_font_bold(10)
        pdf.cell(col_w[0], 10, f"  {label}", border=1, fill=True)
        pdf._set_font_regular(10)
        pdf.cell(col_w[1], 10, f"  {value}", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    if len(sessions_data) >= 2:
        trend_png = _generate_growth_trend_png(sessions_data)
        img_w = 170
        pdf.image(io.BytesIO(trend_png), x=(pdf.w - img_w) / 2, w=img_w)

    # 2. コンピテンシー別の状況（直近5回平均のレーダー + 前5回との比較表）
    pdf.add_page()
    pdf.section_title("2. コンピテンシー別の状況")
    pdf.ln(2)

    recent5 = sessions_data[-5:]
    prev5 = sessions_data[-10:-5]
    recent_avgs = _avg_by_competency(recent5)
    prev_avgs = _avg_by_competency(prev5)

    radar_comps = [
        {"name": COMP_NAMES[cid], "score": recent_avgs.get(cid) or 0}
        for cid in range(1, 9)
    ]
    chart_png = _generate_radar_chart_png(radar_comps)
    img_w = 110
    pdf.image(io.BytesIO(chart_png), x=(pdf.w - img_w) / 2, w=img_w)
    pdf._set_font_regular(8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, f"※ 直近{len(recent5)}回の分析の平均", align="C", new_x="LEFT", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    col_w2 = [78, 30, 30, 24]
    pdf.set_x(pdf.l_margin)
    pdf.set_fill_color(237, 237, 254)
    pdf._set_font_bold(9)
    pdf.cell(col_w2[0], 9, "  コンピテンシー", border=1, fill=True)
    pdf.cell(col_w2[1], 9, "直近5回平均", border=1, fill=True, align="C")
    pdf.cell(col_w2[2], 9, "前5回平均", border=1, fill=True, align="C")
    pdf.cell(col_w2[3], 9, "変化", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf._set_font_regular(9)
    for cid in range(1, 9):
        r = recent_avgs.get(cid)
        p = prev_avgs.get(cid)
        if r is not None and p is not None:
            delta = r - p
            arrow = "↑" if delta >= 0.1 else ("↓" if delta <= -0.1 else "→")
        else:
            arrow = "—"
        pdf.set_x(pdf.l_margin)
        pdf.cell(col_w2[0], 8, f"  C{cid} {COMP_NAMES[cid]}", border=1)
        pdf.cell(col_w2[1], 8, f"{r:.1f}" if r is not None else "—", border=1, align="C")
        pdf.cell(col_w2[2], 8, f"{p:.1f}" if p is not None else "—", border=1, align="C")
        pdf.cell(col_w2[3], 8, arrow, border=1, align="C", new_x="LMARGIN", new_y="NEXT")

    # 3. AIコメント（profile insightがあれば）
    if insight:
        pdf.add_page()
        pdf.section_title("3. AIから見たあなた")
        pdf.ln(2)
        w = pdf.w - pdf.l_margin - pdf.r_margin

        blocks = [
            ("強み", insight.get("strengths")),
            ("改善テーマ", insight.get("improvement_theme")),
        ]
        archetype = insight.get("archetype") or {}
        if archetype.get("label"):
            blocks.append(("コーチタイプ", archetype["label"]))
        recurring = insight.get("recurring") or {}
        if recurring.get("theme"):
            blocks.append(("よく指摘されるテーマ", f"{recurring['theme']}（{recurring.get('count')}回）"))

        for label, text in blocks:
            if not text:
                continue
            pdf._set_font_bold(11)
            pdf.set_text_color(26, 54, 93)
            pdf.cell(0, 8, f"【{label}】", new_x="LEFT", new_y="NEXT")
            pdf._set_font_regular(10)
            pdf.set_text_color(51, 51, 51)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(w, 6, str(text))
            pdf.ln(3)
        pdf.set_text_color(0, 0, 0)

    pdf.output(str(output_path))
    return output_path
