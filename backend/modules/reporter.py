"""PDF レポート生成モジュール（fpdf2 + matplotlib）"""

import base64
import io
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np

# IPA フォントを matplotlib に登録
_IPA_FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
try:
    fm.fontManager.addfont(_IPA_FONT_PATH)
    _MPL_FONT = fm.FontProperties(fname=_IPA_FONT_PATH).get_name()
except Exception:
    _MPL_FONT = "sans-serif"
from fpdf import FPDF

from modules.analyzer import get_qualification_statuses
from modules.transcriber import format_timestamp

# フォントファイルパス（apt install fonts-ipafont でインストール）
_FONT_REGULAR = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
_FONT_BOLD = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"


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

    def cover_page(self, analysis_date: datetime, duration_min: int, duration_sec: int):
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

        # ICF資格別合格可能性
        if qualification_statuses:
            self._set_font_bold(11)
            self.set_text_color(26, 54, 93)
            self.cell(0, 8, "ICF資格別 合格可能性", new_x="LEFT", new_y="NEXT")

            self._set_font_regular(10)
            self.set_text_color(51, 51, 51)
            for qs in qualification_statuses:
                line = f"{qs['icon']} {qs['name']}（{qs['threshold']}基準）：{qs['label']}"
                if qs["status"] != "pass":
                    line += f"  （現在 {qs['avg_score']:.1f} / 目標 {qs['threshold']}）"
                self.set_x(self.l_margin + 4)
                self.cell(0, 7, line, new_x="LMARGIN", new_y="NEXT")

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
            stars = "★" * comp["score"] + "☆" * (5 - comp["score"])
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
    avg_score = sum(c["score"] for c in competencies) / len(competencies)
    pcc_fulfillment_rate = analysis.get("pcc_fulfillment_rate", 0.0)
    mcc_avg_score = analysis.get("mcc_evaluation", {}).get("avg_score")
    qualification_statuses = get_qualification_statuses(avg_score, pcc_fulfillment_rate, mcc_avg_score)

    chart_png = _generate_radar_chart_png(competencies)

    pdf = CoachingReportPDF()

    # 表紙
    pdf.cover_page(now, duration_min, duration_sec)

    # ⚠️ AI注意文
    pdf.ai_notice_section()

    # 1. セッション概要（合格可能性表示を含む）
    pdf.overview_section(
        duration_min, duration_sec,
        coach_ratio, client_ratio, avg_score,
        analysis.get("overall_summary", ""),
        qualification_statuses=qualification_statuses,
        qualification_comment=analysis.get("qualification_comment"),
    )

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
