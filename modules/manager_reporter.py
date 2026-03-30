"""マネジャー1on1 PDFレポート生成モジュール"""

import io
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from fpdf import FPDF

from modules.manager_analyzer import LAYER1_AXES, LAYER2_AXES
from modules.transcriber import format_timestamp

# フォントファイルパス（reporter.py と同じ優先順位）
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

try:
    fm.fontManager.addfont(_FONT_REGULAR)
    _MPL_FONT = fm.FontProperties(fname=_FONT_REGULAR).get_name()
except Exception:
    _MPL_FONT = "sans-serif"


# ---------------------------------------------------------------------------
# レーダーチャート生成（層①・層②を横並びで1枚のPNGに）
# ---------------------------------------------------------------------------
def _generate_dual_radar_chart_png(layer1_axes: list[dict], layer2_axes: list[dict]) -> bytes:
    fig, (ax1, ax2) = plt.subplots(
        1, 2, figsize=(12, 6),
        subplot_kw=dict(polar=True)
    )

    for ax, axes_data, title, color in [
        (ax1, layer1_axes, "層①　マネジャースキル", "#3b82f6"),
        (ax2, layer2_axes, "層②　1on1の場の質",     "#10b981"),
    ]:
        labels = [a["name"] for a in axes_data]
        scores = [a["score"] for a in axes_data]
        n = len(labels)
        angles = np.linspace(0, 2 * np.pi, n, endpoint=False).tolist()
        scores_plot = scores + [scores[0]]
        angles_plot = angles + [angles[0]]

        ax.set_ylim(0, 5)
        ax.set_yticks([1, 2, 3, 4, 5])
        ax.set_yticklabels(["1", "2", "3", "4", "5"], fontsize=8, color="#999")
        ax.set_xticks(angles)
        ax.set_xticklabels(labels, fontsize=9, fontfamily=_MPL_FONT)
        ax.plot(angles_plot, scores_plot, "o-", linewidth=2, color=color)
        ax.fill(angles_plot, scores_plot, alpha=0.25, color=color)
        ax.set_title(title, fontsize=12, fontfamily=_MPL_FONT, pad=20)

    plt.tight_layout(pad=3.0)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# PDF クラス
# ---------------------------------------------------------------------------
class ManagerReportPDF(FPDF):

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

    def cover_page(self, analysis_date: datetime, duration_min: int, duration_sec: int):
        self.add_page()
        self.ln(60)

        self._set_font_bold(22)
        self.set_text_color(26, 54, 93)
        self.cell(0, 14, "管理職1on1セッション", align="C", new_x="LEFT", new_y="NEXT")
        self.cell(0, 14, "分析レポート", align="C", new_x="LEFT", new_y="NEXT")

        self.ln(10)
        self._set_font_regular(11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "ICFコアコンピテンシー（2025年版）を管理職1on1に応用した評価軸", align="C", new_x="LEFT", new_y="NEXT")

        self.ln(16)
        self._set_font_regular(12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"分析日時: {analysis_date.strftime('%Y年%m月%d日 %H:%M')} (UTC)", align="C", new_x="LEFT", new_y="NEXT")
        self.cell(0, 8, f"セッション時間: {duration_min}分{duration_sec}秒", align="C", new_x="LEFT", new_y="NEXT")

        self.set_text_color(0, 0, 0)

    def ai_notice_section(self):
        self.add_page()
        self.ln(4)
        self.set_fill_color(240, 240, 240)
        self.set_draw_color(180, 180, 180)
        self.set_line_width(0.3)

        notice_lines = [
            "！ 注意事項",
            "本レポートはAI（Claude）によって自動的に評価・作成されています。",
            "ICFコアコンピテンシー（2025年版）を管理職1on1に応用した評価軸に基づく参考情報です。",
            "評価結果はICF公式の審査・認定とは無関係であり、絶対的なものではありません。",
            "結果はマネジャー自身の振り返りや育成支援の参考としてご活用ください。",
        ]

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

    def section_title(self, title: str):
        self._set_font_bold(14)
        self.set_text_color(26, 54, 93)
        self.cell(0, 10, title, new_x="LEFT", new_y="NEXT")
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)
        self.set_text_color(0, 0, 0)
        self.set_draw_color(0, 0, 0)

    def overview_section(
        self,
        duration_min: int,
        duration_sec: int,
        manager_ratio: int,
        subordinate_ratio: int,
        avg_score: float,
        overall_summary: str,
    ):
        self.add_page()
        self.section_title("1. セッション概要")
        self.ln(2)

        col_w = [70, 100]
        rows = [
            ("総時間",             f"{duration_min}分{duration_sec}秒"),
            ("マネジャー発話比率", f"{manager_ratio}%"),
            ("部下発話比率",       f"{subordinate_ratio}%"),
            ("平均スコア",         f"{avg_score:.1f} / 5.0"),
        ]

        for label, value in rows:
            self.set_x(self.l_margin)
            self.set_fill_color(247, 250, 252)
            self._set_font_bold(10)
            self.cell(col_w[0], 10, f"  {label}", border=1, fill=True)
            self._set_font_regular(10)
            self.cell(col_w[1], 10, f"  {value}", border=1, new_x="LMARGIN", new_y="NEXT")

        self.ln(6)

        # 全体総評
        self._set_font_bold(12)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "全体総評", new_x="LEFT", new_y="NEXT")
        self.set_text_color(51, 51, 51)
        self._set_font_regular(10)
        self.multi_cell(0, 6, overall_summary)
        self.set_text_color(0, 0, 0)

    def radar_chart_section(self, chart_png: bytes):
        self.add_page()
        self.section_title("2. 評価スコア一覧")
        self.ln(3)

        img_w = 180
        x = (self.w - img_w) / 2
        self.image(io.BytesIO(chart_png), x=x, w=img_w)

    def _ensure_space(self, needed_mm: float = 30):
        """指定した高さ（mm）が残っていなければ改ページする"""
        if self.get_y() + needed_mm > self.h - self.b_margin:
            self.add_page()
            self.set_x(self.l_margin)

    def axis_detail_section(self, axes: list[dict]):
        self.add_page()
        self.section_title("3. 評価軸別詳細分析")
        self.ln(2)

        for axis in axes:
            w = self.w - self.l_margin - self.r_margin

            # 軸ヘッダー（層ラベル＋軸名＋スコア）は最低40mm確保
            self._ensure_space(40)

            # 層ラベル
            layer_label = "層①マネジャースキル" if axis["id"] <= 5 else "層②1on1の場の質"
            self._set_font_regular(8)
            self.set_text_color(100, 100, 100)
            self.set_x(self.l_margin)
            self.cell(0, 5, f"{layer_label}  /  {axis.get('icf', '')}", new_x="LEFT", new_y="NEXT")

            # 評価軸名
            self._set_font_bold(12)
            self.set_text_color(45, 55, 72)
            self.set_x(self.l_margin)
            self.cell(0, 8, f"{axis['id']}. {axis['name']}", new_x="LEFT", new_y="NEXT")

            # スコア
            self._set_font_bold(18)
            self.set_text_color(59, 130, 246)
            self.set_x(self.l_margin)
            self.cell(15, 10, str(axis["score"]))
            self._set_font_regular(10)
            self.set_text_color(150, 150, 150)
            self.cell(15, 10, "/ 5")
            stars = "★" * round(axis["score"]) + "☆" * (5 - round(axis["score"]))
            self.set_text_color(59, 130, 246)
            self._set_font_regular(12)
            self.cell(0, 10, stars, new_x="LEFT", new_y="NEXT")

            self.set_text_color(51, 51, 51)

            # 評価コメント（最低20mm確保）
            self._ensure_space(20)
            self._set_font_regular(10)
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, axis.get("comment", ""))
            self.ln(2)

            # 根拠となる発言（observed=True のもの）
            quotes = [
                ind["evidence"]
                for ind in axis.get("indicators", [])
                if ind.get("observed") and ind.get("evidence")
            ]
            if quotes:
                self._ensure_space(20)
                self._set_font_bold(9)
                self.set_text_color(74, 85, 104)
                self.set_x(self.l_margin)
                self.cell(w, 6, "根拠となる発言", new_x="LEFT", new_y="NEXT")
                self._set_font_regular(9)
                self.set_text_color(51, 51, 51)
                for q in quotes:
                    self._ensure_space(10)
                    self.set_x(self.l_margin)
                    self.multi_cell(w, 5, "  " + q)
                self.ln(2)

            # 改善提案
            improvements = axis.get("improvements", [])
            if improvements:
                self._ensure_space(25)
                self._set_font_bold(9)
                self.set_text_color(74, 85, 104)
                self.set_x(self.l_margin)
                self.cell(w, 6, "改善提案", new_x="LEFT", new_y="NEXT")
                self._set_font_regular(9)
                self.set_text_color(51, 51, 51)
                for imp in improvements:
                    self._ensure_space(25)
                    self.set_x(self.l_margin)
                    if isinstance(imp, dict):
                        self._set_font_bold(9)
                        self.set_text_color(45, 55, 72)
                        self.set_x(self.l_margin)
                        self.multi_cell(w, 5, "  【改善提案】")
                        self._set_font_regular(9)
                        self.set_text_color(51, 51, 51)
                        self.set_x(self.l_margin)
                        self.multi_cell(w, 5, "  " + imp.get("proposal", ""))
                        self._ensure_space(15)
                        self._set_font_bold(9)
                        self.set_text_color(45, 55, 72)
                        self.set_x(self.l_margin)
                        self.multi_cell(w, 5, "  【次の1on1で試せること】")
                        self._set_font_regular(9)
                        self.set_text_color(51, 51, 51)
                        self.set_x(self.l_margin)
                        self.multi_cell(w, 5, "  " + imp.get("next_action", ""))
                        self.ln(2)
                    else:
                        self.set_x(self.l_margin)
                        self.multi_cell(w, 5, "  " + imp)

            self.ln(4)
            self._ensure_space(8)
            self.set_draw_color(226, 232, 240)
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(4)
            self.set_draw_color(0, 0, 0)

    def strengths_improvements_section(self, strengths_improvements: dict):
        self.add_page()
        self.section_title("4. マネジャーの強み・改善点")
        self.ln(2)

        w = self.w - self.l_margin - self.r_margin

        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【強み】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        for item in strengths_improvements.get("strengths", []):
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, f"・{item}")
        self.ln(4)

        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【改善点】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        for item in strengths_improvements.get("improvements", []):
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, f"・{item}")
        self.ln(4)

        self._set_font_bold(11)
        self.set_text_color(26, 54, 93)
        self.cell(0, 8, "【総合コメント】", new_x="LEFT", new_y="NEXT")
        self._set_font_regular(10)
        self.set_text_color(51, 51, 51)
        self.set_x(self.l_margin)
        self.multi_cell(w, 6, strengths_improvements.get("overall_comment", ""))
        self.set_text_color(0, 0, 0)


# ---------------------------------------------------------------------------
# エントリーポイント
# ---------------------------------------------------------------------------
def generate_manager_report(
    analysis: dict,
    transcription: dict,
    output_dir: Path,
) -> Path:
    now = datetime.now(timezone.utc)
    filename = f"manager_1on1_report_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = output_dir / filename

    duration = transcription["duration_seconds"]
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)

    # 発話比率（transcriber は coach=マネジャー, client=部下 として処理）
    total_chars = transcription["coach_word_count"] + transcription["client_word_count"]
    manager_ratio = (
        round(transcription["coach_word_count"] / total_chars * 100)
        if total_chars > 0 else 0
    )
    subordinate_ratio = 100 - manager_ratio

    axes = analysis.get("axes", [])
    avg_score = sum(a["score"] for a in axes) / len(axes) if axes else 0.0

    # 層別に分割してレーダーチャート生成
    layer1 = [a for a in axes if a["id"] <= 5]
    layer2 = [a for a in axes if a["id"] > 5]
    chart_png = _generate_dual_radar_chart_png(layer1, layer2)

    pdf = ManagerReportPDF()
    pdf.cover_page(now, duration_min, duration_sec)
    pdf.ai_notice_section()
    pdf.overview_section(
        duration_min, duration_sec,
        manager_ratio, subordinate_ratio,
        avg_score,
        analysis.get("overall_summary", ""),
    )
    pdf.radar_chart_section(chart_png)
    pdf.axis_detail_section(axes)

    si = analysis.get("strengths_improvements")
    if si:
        pdf.strengths_improvements_section(si)

    pdf.output(str(output_path))
    return output_path
