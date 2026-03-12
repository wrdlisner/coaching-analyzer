"""Claude API によるICFコンピテンシー分析モジュール（v3: PCCマーカー充足率ベース）"""

import json
import logging

import anthropic

logger = logging.getLogger(__name__)

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, ICF_COMPETENCIES

# ---------------------------------------------------------------------------
# PCC マーカー定義（コンピテンシー3〜8）
# コンピテンシー1・2はPCC公式マーカーがないため総合評価
# ---------------------------------------------------------------------------
PCC_MARKERS: dict[int, list[dict]] = {
    3: [
        {"id": "3.1", "text": "コーチはクライアントとともに、このセッションで達成したいことを確認する"},
        {"id": "3.2", "text": "コーチはクライアントとともに、達成の成功指標を定義または確認する"},
        {"id": "3.3", "text": "コーチはセッションで達成したいことがクライアントにとって重要・意味ある理由を探求する"},
        {"id": "3.4", "text": "コーチはクライアントとともに、目標達成のために取り組む必要があることを定義する"},
    ],
    4: [
        {"id": "4.1", "text": "コーチはクライアントの才能・洞察・プロセスへの貢献を認め、尊重する"},
        {"id": "4.2", "text": "コーチはクライアントへのサポート・共感・関心を示す"},
        {"id": "4.3", "text": "コーチはクライアントの感情・認識・懸念・信念・提案の表現を認め、支持する"},
        {"id": "4.4", "text": "コーチはクライアントに対し、コーチの貢献への反応を促し、その反応を受け入れる"},
    ],
    5: [
        {"id": "5.1", "text": "コーチはクライアントの全人格（who）に応答して行動する"},
        {"id": "5.2", "text": "コーチはセッションを通じてクライアントが達成したいこと（what）に応答する"},
        {"id": "5.3", "text": "コーチはクライアントがセッションで起きることを選択できるよう支援する"},
        {"id": "5.4", "text": "コーチはクライアントについてさらに知ろうとする好奇心を示す"},
        {"id": "5.5", "text": "コーチは沈黙・間・内省を許容する"},
    ],
    6: [
        {"id": "6.1", "text": "コーチの質問や観察は、クライアントについて学んだことを活用してカスタマイズされている"},
        {"id": "6.2", "text": "コーチはクライアントが使う言葉を探求する"},
        {"id": "6.3", "text": "コーチはクライアントの感情を探求する"},
        {"id": "6.4", "text": "コーチはクライアントのエネルギーの変化・非言語的サイン・行動を探求する"},
        {"id": "6.5", "text": "コーチはクライアントの現在の自己認識や世界観を探求する"},
        {"id": "6.6", "text": "コーチはクライアントが話し終えるまで遮らない（コーチング上の目的がある場合を除く）"},
        {"id": "6.7", "text": "コーチはクライアントが伝えたことを簡潔に反映または要約する"},
    ],
    7: [
        {"id": "7.1", "text": "コーチはクライアントの思考・感情・価値観・ニーズ・欲求・信念・行動について質問する"},
        {"id": "7.2", "text": "コーチはクライアントが現在の思考・感情を超えた新たな自己認識へ探求するよう質問する"},
        {"id": "7.3", "text": "コーチはクライアントが現在の思考・感情を超えた状況への新たな認識へ探求するよう質問する"},
        {"id": "7.4", "text": "コーチはクライアントが現在の思考・感情・行動を超えた望む成果に向けて探求するよう質問する"},
        {"id": "7.5", "text": "コーチは観察・直感・コメント・思考・感情を執着なくシェアし、クライアントの探求を促す"},
        {"id": "7.6", "text": "コーチは明確で直接的な、主にオープンエンドの質問を一度に一つ、クライアントが考え・感じ・内省できるペースで行う"},
        {"id": "7.7", "text": "コーチは一般的に明確で簡潔な言語を使う"},
        {"id": "7.8", "text": "コーチはクライアントが大部分の発言をできるようにする"},
    ],
    8: [
        {"id": "8.1", "text": "コーチはクライアントが達成したかったことへの進捗を探求するよう促す"},
        {"id": "8.2", "text": "コーチはクライアントがこのセッションでの自己（who）についての学びを述べ・探求するよう促す"},
        {"id": "8.3", "text": "コーチはクライアントがこのセッションでの状況（what）についての学びを述べ・探求するよう促す"},
        {"id": "8.4", "text": "コーチはクライアントがセッションの新たな学びをどう活用するか考えるよう促す"},
        {"id": "8.5", "text": "コーチはクライアントとともにセッション後の思考・内省・行動を設計する"},
        {"id": "8.6", "text": "コーチはクライアントとともに、リソース・サポート・潜在的障壁を含む前進の方法を検討する"},
        {"id": "8.7", "text": "コーチはクライアントとともに、最適なアカウンタビリティの方法を設計する"},
        {"id": "8.8", "text": "コーチはクライアントの進歩と学びを称える"},
        {"id": "8.9", "text": "コーチはクライアントとともに、このセッションの締め方を設計する"},
    ],
}

COMP_NAMES = {
    1: "倫理に従った実践",
    2: "コーチングマインドセットの体現",
    3: "合意内容の確立と維持",
    4: "信頼と安心感の育成",
    5: "プレゼンスの維持",
    6: "積極的傾聴",
    7: "気づきの喚起",
    8: "クライアントの成長の促進",
}

# MCC 質的評価軸（PCCマーカー充足率 >= 80% の場合に評価）
MCC_AXES = [
    {"id": "mcc1", "name": "介入の少なさ",       "description": "コーチの発言が短く、クライアントの思考を遮らない"},
    {"id": "mcc2", "name": "質問の深さ",           "description": "表面的な確認ではなく、クライアントの本質的な変容を促す問いかけ"},
    {"id": "mcc3", "name": "クライアントの自律性", "description": "クライアント自身が気づき・決断・行動を選択している"},
    {"id": "mcc4", "name": "存在としてのコーチ",   "description": "技術ではなく、コーチの「在り方」から自然に湧き出る関わり"},
    {"id": "mcc5", "name": "セッションの流れ",     "description": "構造に依存せず、クライアントのニーズに完全に応じた柔軟な展開"},
]

# ---------------------------------------------------------------------------
# 充足率 → スコア変換
# ---------------------------------------------------------------------------
def fulfillment_to_score(rate: float) -> int:
    if rate >= 0.90:
        return 5
    elif rate >= 0.70:
        return 4
    elif rate >= 0.50:
        return 3
    elif rate >= 0.30:
        return 2
    else:
        return 1


# ---------------------------------------------------------------------------
# ICF資格合格可能性判定
# ---------------------------------------------------------------------------
def get_qualification_statuses(avg_score: float, pcc_fulfillment_rate: float, mcc_avg_score: float | None) -> list[dict]:
    thresholds = {"ACC": 3.0, "PCC": 3.8}
    result = []

    for name, threshold in thresholds.items():
        diff = threshold - avg_score
        if diff <= 0:
            status, label, icon = "pass", "合格圏内", "◎"
        elif diff <= 0.5:
            status, label, icon = "close", "もう一歩", "△"
        else:
            status, label, icon = "needs_work", "要強化", "×"
        result.append({"name": name, "threshold": threshold, "status": status, "label": label, "icon": icon})

    # MCC: PCCマーカー充足率 >= 80% かつ MCC質的評価平均 >= 4.5
    if pcc_fulfillment_rate >= 0.80 and mcc_avg_score is not None:
        diff = 4.5 - mcc_avg_score
        if diff <= 0:
            status, label, icon = "pass", "合格圏内", "◎"
        elif diff <= 0.5:
            status, label, icon = "close", "もう一歩", "△"
        else:
            status, label, icon = "needs_work", "要強化", "×"
    else:
        status, label, icon = "needs_work", "要強化", "×"
    result.append({"name": "MCC", "threshold": 4.5, "status": status, "label": label, "icon": icon})

    return result


# ---------------------------------------------------------------------------
# プロンプト生成ヘルパー
# ---------------------------------------------------------------------------
def _build_markers_prompt_section() -> str:
    lines = []
    for comp_id, markers in PCC_MARKERS.items():
        lines.append(f"\n**コンピテンシー{comp_id}（{COMP_NAMES[comp_id]}）のPCCマーカー**")
        for m in markers:
            lines.append(f"  {m['id']}: {m['text']}")
    return "\n".join(lines)


def _build_comp_json_schema() -> str:
    """JSON出力スキーマの例を生成（コンピテンシー1・2と3〜8で形式が異なる）"""
    comp12_example = """\
    {{
      "id": 1,
      "name": "倫理に従った実践",
      "score": 3,
      "comment": "総合評価コメント（200〜400字）",
      "quotes": ["発言引用1", "発言引用2"],
      "improvements": ["改善提案1", "改善提案2"]
    }},
    {{
      "id": 2,
      "name": "コーチングマインドセットの体現",
      "score": 3,
      "comment": "総合評価コメント（200〜400字）",
      "quotes": ["発言引用1", "発言引用2"],
      "improvements": ["改善提案1", "改善提案2"]
    }}"""

    comp38_example = """\
    {{
      "id": 3,
      "name": "合意内容の確立と維持",
      "comment": "コンピテンシー全体の評価コメント（100〜200字）",
      "markers": [
        {{"id": "3.1", "observed": true,  "evidence": "観察された発言の引用"}},
        {{"id": "3.2", "observed": false, "evidence": "観察されなかった理由を簡潔に"}},
        {{"id": "3.3", "observed": true,  "evidence": "観察された発言の引用"}},
        {{"id": "3.4", "observed": false, "evidence": "観察されなかった理由を簡潔に"}}
      ],
      "improvements": ["改善提案1", "改善提案2"]
    }}"""

    mcc_example = """\
    {{
      "axes": [
        {{"id": "mcc1", "name": "介入の少なさ",       "score": 4, "comment": "評価根拠（100字以内）"}},
        {{"id": "mcc2", "name": "質問の深さ",           "score": 3, "comment": "評価根拠（100字以内）"}},
        {{"id": "mcc3", "name": "クライアントの自律性", "score": 4, "comment": "評価根拠（100字以内）"}},
        {{"id": "mcc4", "name": "存在としてのコーチ",   "score": 3, "comment": "評価根拠（100字以内）"}},
        {{"id": "mcc5", "name": "セッションの流れ",     "score": 4, "comment": "評価根拠（100字以内）"}}
      ]
    }}"""

    return comp12_example, comp38_example, mcc_example


# ---------------------------------------------------------------------------
# システムプロンプト
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
あなたはICF（国際コーチング連盟）認定のマスターコーチであり、\
コーチングセッションの評価エキスパートです。

以下のルールに従ってコーチングセッションを分析してください：

1. ICF PCC Markers（2021年改訂版）を評価軸に使用すること
2. すべて日本語で出力すること
3. 評価は具体的な発言の引用に基づくこと
4. 批判的かつ建設的なフィードバックを行うこと
5. コンピテンシー1・2は総合評価（スコア1〜5）、コンピテンシー3〜8はPCCマーカー単位で評価すること
6. 発言を引用する際、人名・会社名・地名などの固有名詞は必ず伏字にすること（例：「田中さん」→「クライアントさん」、「株式会社○○」→「クライアントの会社」、地名は「ある地域」など）
"""


def build_prompt(transcript_text: str, is_follow_up: bool) -> str:
    session_type_note = "継続セッション（2回目以降）" if is_follow_up else "初回セッション"
    markers_section = _build_markers_prompt_section()
    comp12_ex, comp38_ex, mcc_ex = _build_comp_json_schema()

    follow_up_instruction = ""
    comp1_note = ""
    comp3_note = ""
    if is_follow_up:
        follow_up_instruction = """\

【継続セッションの評価方針】
- コンピテンシー1「倫理に従った実践」のうち、コーチング契約・守秘義務説明・倫理説明は\
評価対象外とし、commentに「継続セッションのため評価対象外」と明記すること
- セッションの枠組み・境界線の初期設定・関係性構築の初動は評価対象外とすること
- コンピテンシー3「合意内容の確立と維持」は、新規契約ではなく\
「前回からの継続性・ゴールの更新・アジェンダの調整」という観点で評価すること
"""
        comp1_note = "（継続セッション：守秘義務・契約説明など初回固有部分は対象外）"
        comp3_note = "（継続セッション：前回からの継続性・ゴールの更新という観点で評価）"

    return f"""\
以下のコーチングセッションのトランスクリプトを分析してください。

## セッション種別
{session_type_note}
{follow_up_instruction}
## トランスクリプト
{transcript_text}

## 評価対象PCCマーカー一覧
{markers_section}

## MCC質的評価軸（コンピテンシー3〜8のPCCマーカー全体の充足率が80%以上の場合のみ評価）
- mcc1「介入の少なさ」: コーチの発言が短く、クライアントの思考を遮らない
- mcc2「質問の深さ」: 表面的な確認ではなく、クライアントの本質的な変容を促す問いかけ
- mcc3「クライアントの自律性」: クライアント自身が気づき・決断・行動を選択している
- mcc4「存在としてのコーチ」: 技術ではなく、コーチの「在り方」から自然に湧き出る関わり
- mcc5「セッションの流れ」: 構造に依存せず、クライアントのニーズに完全に応じた柔軟な展開

## 分析指示

以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

コンピテンシー1・2は総合スコア（1〜5）で評価し、コンピテンシー3〜8は\
各PCCマーカーを「observed: true/false」で評価してください。

```json
{{
  "overall_summary": "セッション全体の総評（200字程度）",
  "qualification_comment": "ICF資格合格可能性に関するコメント。PCCマーカー充足状況と最注力課題を具体的に（80〜120字）",
  "strengths_improvements": {{
    "strengths": ["強み1", "強み2", "強み3"],
    "improvements": ["改善点1", "改善点2", "改善点3"],
    "overall_comment": "建設的かつ前向きなアドバイス（200字程度）"
  }},
  "competencies": [
    {comp12_ex},
    {comp38_ex},
    ...（コンピテンシー4〜8も同様にmarkers形式で記載）
  ],
  "mcc_evaluation": {mcc_ex}
}}
```

コンピテンシー一覧：
1. 倫理に従った実践{comp1_note}（総合評価）
2. コーチングマインドセットの体現（総合評価）
3. 合意内容の確立と維持{comp3_note}（PCCマーカー3.1〜3.4）
4. 信頼と安心感の育成（PCCマーカー4.1〜4.4）
5. プレゼンスの維持（PCCマーカー5.1〜5.5）
6. 積極的傾聴（PCCマーカー6.1〜6.7）
7. 気づきの喚起（PCCマーカー7.1〜7.8）
8. クライアントの成長の促進（PCCマーカー8.1〜8.9）

mcc_evaluationは、コンピテンシー3〜8の全PCCマーカーの充足率が80%未満の場合は\
axesを空配列（[]）にしてください。
"""


# ---------------------------------------------------------------------------
# メイン分析関数
# ---------------------------------------------------------------------------
def analyze_session(utterances: list[dict], is_follow_up: bool = False) -> dict:
    """
    文字起こし結果をClaude APIで分析する。

    PCCマーカー充足率からスコアを算出し、80%以上の場合はMCC質的評価も行う。

    Returns dict with:
        overall_summary, qualification_comment, strengths_improvements,
        competencies (with markers for 3-8, score computed from fulfillment),
        pcc_fulfillment_rate, mcc_evaluation
    """
    # トランスクリプトをテキスト化
    transcript_lines = []
    for utt in utterances:
        start_min = utt["start"] // 60000
        start_sec = (utt["start"] // 1000) % 60
        timestamp = f"[{start_min:02d}:{start_sec:02d}]"
        transcript_lines.append(f"{timestamp} {utt['speaker']}: {utt['text']}")

    transcript_text = "\n".join(transcript_lines)

    # [LOG] Step 3: confirm is_follow_up received in analyzer
    logger.info(f"[analyzer] analyze_session called: is_follow_up={is_follow_up}, utterances={len(utterances)}")

    prompt = build_prompt(transcript_text, is_follow_up)

    # [LOG] Step 4: confirm session type line appears in prompt
    session_type_line = next((l for l in prompt.splitlines() if "セッション種別" in l or "初回" in l or "継続" in l), "NOT FOUND")
    logger.info(f"[analyzer] prompt session_type_note: {session_type_line.strip()}")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=10000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text

    # JSONブロックを抽出
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0].strip()
    else:
        json_str = response_text.strip()

    result = json.loads(json_str)

    # -----------------------------------------------------------------------
    # PCCマーカー充足率 → スコア の後処理
    # -----------------------------------------------------------------------
    total_markers = 0
    total_observed = 0

    for comp in result.get("competencies", []):
        comp_id = comp["id"]
        if comp_id in PCC_MARKERS:
            markers = comp.get("markers", [])
            observed_count = sum(1 for m in markers if m.get("observed", False))
            total_count = len(markers)

            if total_count > 0:
                rate = observed_count / total_count
            else:
                rate = 0.0

            comp["fulfillment_rate"] = round(rate, 3)
            comp["score"] = fulfillment_to_score(rate)
            total_markers += total_count
            total_observed += observed_count
        # コンピテンシー1・2: Claudeが直接スコアを返すのでそのまま使用

    # 全体PCCマーカー充足率
    pcc_fulfillment_rate = (total_observed / total_markers) if total_markers > 0 else 0.0
    result["pcc_fulfillment_rate"] = round(pcc_fulfillment_rate, 3)

    # -----------------------------------------------------------------------
    # MCC 評価後処理
    # -----------------------------------------------------------------------
    mcc_eval = result.get("mcc_evaluation", {})
    mcc_axes = mcc_eval.get("axes", [])

    if pcc_fulfillment_rate >= 0.80 and mcc_axes:
        mcc_scores = [a["score"] for a in mcc_axes if isinstance(a.get("score"), (int, float))]
        mcc_avg = sum(mcc_scores) / len(mcc_scores) if mcc_scores else 0.0
        mcc_eval["avg_score"] = round(mcc_avg, 2)
        mcc_eval["is_mcc_eligible"] = mcc_avg >= 4.5
    else:
        # PCCマーカー充足率が低い場合はMCC評価対象外
        mcc_eval["axes"] = []
        mcc_eval["avg_score"] = None
        mcc_eval["is_mcc_eligible"] = False
        mcc_eval["reason"] = f"PCCマーカー充足率 {pcc_fulfillment_rate:.0%}（MCC評価には80%以上必要）"

    result["mcc_evaluation"] = mcc_eval

    return result
