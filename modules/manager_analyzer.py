"""Claude API によるマネジャー1on1分析モジュール"""

import json
import logging

import anthropic

logger = logging.getLogger(__name__)

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from modules.analyzer import fulfillment_to_score

# ---------------------------------------------------------------------------
# 評価軸定義（ICFコアコンピテンシーを管理職1on1に翻訳）
# ---------------------------------------------------------------------------

LAYER1_AXES = [
    {
        "id": 1,
        "name": "傾聴と共感",
        "icf": "C6：積極的傾聴",
        "description": "部下の言葉・感情・非言語を拾えているか。要約・言い換え・感情への応答ができているか",
        "indicators": [
            {"id": "1.1", "text": "部下の発言を遮らずに最後まで聞いている"},
            {"id": "1.2", "text": "部下の感情・感情的な表現に応答している"},
            {"id": "1.3", "text": "要約・言い換えで理解を示している"},
            {"id": "1.4", "text": "部下の言葉の奥にある意図・感情を拾っている"},
            {"id": "1.5", "text": "評価・判断なく部下の言葉をそのまま受け取っている"},
        ],
    },
    {
        "id": 2,
        "name": "質問力",
        "icf": "C7：気づきの喚起",
        "description": "部下自身が考えるような問いかけができているか。Yes/Noで終わらないオープンな質問ができているか",
        "indicators": [
            {"id": "2.1", "text": "Yes/Noで終わらないオープンな質問をしている"},
            {"id": "2.2", "text": "部下自身が考えるような問いかけをしている"},
            {"id": "2.3", "text": "一度に一つの質問をしている"},
            {"id": "2.4", "text": "部下の言葉・思考を深掘りする問いをしている"},
            {"id": "2.5", "text": "答えを誘導しない中立的な問い方をしている"},
        ],
    },
    {
        "id": 3,
        "name": "フィードバックの質",
        "icf": "C7：気づきの喚起",
        "description": "具体的な行動に基づいているか。人格攻撃になっていないか。改善の方向性が示せているか",
        "indicators": [
            {"id": "3.1", "text": "具体的な行動・事実に基づいたフィードバックをしている"},
            {"id": "3.2", "text": "人格・性格への攻撃になっていない"},
            {"id": "3.3", "text": "改善の方向性・次のアクションを示している"},
            {"id": "3.4", "text": "ポジティブな側面も伝えている"},
            {"id": "3.5", "text": "部下が受け取りやすい伝え方をしている"},
        ],
    },
    {
        "id": 4,
        "name": "強みを活かした関わり",
        "icf": "C4：信頼と安心感の育成",
        "description": "部下の強みや才能を認識・言語化しているか。弱みの指摘だけに偏っていないか",
        "indicators": [
            {"id": "4.1", "text": "部下の強み・才能を言語化・認識している"},
            {"id": "4.2", "text": "弱みの指摘だけに偏っていない"},
            {"id": "4.3", "text": "部下の貢献・成果を認めている"},
            {"id": "4.4", "text": "部下の可能性を信じた関わり方をしている"},
        ],
    },
    {
        "id": 5,
        "name": "部下の自律性の促進",
        "icf": "C8：クライアントの成長促進",
        "description": "答えを与えすぎていないか。部下が自分で考え・決断できるような関わりになっているか",
        "indicators": [
            {"id": "5.1", "text": "答えを与えすぎていない（部下が自分で考える余地がある）"},
            {"id": "5.2", "text": "部下自身が決断・選択できるような関わり方をしている"},
            {"id": "5.3", "text": "部下の主体性・オーナーシップを引き出している"},
            {"id": "5.4", "text": "指示・命令ではなく問いかけで引き出している"},
        ],
    },
]

LAYER2_AXES = [
    {
        "id": 6,
        "name": "心理的安全性",
        "icf": "C4：信頼と安心感の育成",
        "description": "部下が本音・失敗・悩みを話せる雰囲気が作られているか",
        "indicators": [
            {"id": "6.1", "text": "部下が本音・失敗・悩みを話せる雰囲気がある"},
            {"id": "6.2", "text": "マネジャーが否定・批判せず受け止めている"},
            {"id": "6.3", "text": "部下が安心して話せるような応答をしている"},
            {"id": "6.4", "text": "ジャッジメントのない空間が作られている"},
        ],
    },
    {
        "id": 7,
        "name": "目標・アジェンダの明確さ",
        "icf": "C3：合意内容の確立と維持",
        "description": "1on1のゴールと進め方が明確か。次のアクションが合意されているか",
        "indicators": [
            {"id": "7.1", "text": "1on1のゴールや今日のテーマが明確にされている"},
            {"id": "7.2", "text": "次のアクションが合意されている"},
            {"id": "7.3", "text": "セッションのクロージングが適切に行われている"},
            {"id": "7.4", "text": "部下のニーズに合った議題になっている"},
        ],
    },
    {
        "id": 8,
        "name": "部下のエンゲージメント",
        "icf": "C5：プレゼンスの維持",
        "description": "部下が主体的に話しているか。発話比率・エネルギーの変化を観察できているか",
        "indicators": [
            {"id": "8.1", "text": "部下が主体的に話している（発話量が多い）"},
            {"id": "8.2", "text": "部下のエネルギー・熱量の変化を観察・応答している"},
            {"id": "8.3", "text": "部下が自分の考えを積極的に表現している"},
            {"id": "8.4", "text": "部下の関与度・主体性が高い"},
        ],
    },
    {
        "id": 9,
        "name": "成長支援",
        "icf": "C8：クライアントの成長促進",
        "description": "この1on1が部下の成長につながっているか。学びの統合と次へのアクションが促せているか",
        "indicators": [
            {"id": "9.1", "text": "部下の成長につながる関わりがある"},
            {"id": "9.2", "text": "学びの統合・振り返りが促されている"},
            {"id": "9.3", "text": "次へのアクションが明確になっている"},
            {"id": "9.4", "text": "部下の成長・進歩を称えている・認めている"},
        ],
    },
    {
        "id": 10,
        "name": "マネジャーのプレゼンス",
        "icf": "C5：プレゼンスの維持",
        "description": "マネジャーが部下に完全に集中できているか。非言語・エネルギーの変化を察知できているか",
        "indicators": [
            {"id": "10.1", "text": "マネジャーが部下に完全に集中している"},
            {"id": "10.2", "text": "マネジャーが自分のアジェンダを手放している"},
            {"id": "10.3", "text": "マネジャーの関わりが自然で強制的でない"},
            {"id": "10.4", "text": "場の流れをマネジャーがコントロールしすぎていない"},
        ],
    },
]

ALL_AXES = LAYER1_AXES + LAYER2_AXES

# ---------------------------------------------------------------------------
# システムプロンプト
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
あなたはICF（国際コーチング連盟）認定のマスターコーチかつ管理職育成の専門家です。
ICFコアコンピテンシー（2025年版）を管理職の1on1文脈に翻訳した評価軸に基づき、
マネジャーの1on1セッションを分析してください。

以下のルールに従ってください：
1. すべて日本語で出力すること
2. 評価は具体的な発言の引用に基づくこと
3. 批判的かつ建設的なフィードバックを行うこと
4. 発言を引用する際、人名・会社名・地名などの固有名詞は必ず伏字にすること
   （例：「田中さん」→「部下さん」、「株式会社○○」→「部下の会社」）
5. 改善提案は非審判的なスタイルで、マネジャーが実践しやすい具体的な内容にすること
"""


# ---------------------------------------------------------------------------
# プロンプト生成
# ---------------------------------------------------------------------------
def _build_indicators_section() -> str:
    lines = []
    for axis in ALL_AXES:
        layer = "層①マネジャースキル" if axis["id"] <= 5 else "層②1on1の場の質"
        lines.append(f"\n**評価軸{axis['id']}「{axis['name']}」（{layer} / {axis['icf']}）**")
        lines.append(f"  評価の観点：{axis['description']}")
        for ind in axis["indicators"]:
            lines.append(f"  {ind['id']}: {ind['text']}")
    return "\n".join(lines)


def _build_json_schema_example() -> str:
    return """\
{
  "overall_summary": "セッション全体の総評（200字程度）",
  "strengths_improvements": {
    "strengths": ["強み1", "強み2", "強み3"],
    "improvements": ["改善点1", "改善点2", "改善点3"],
    "overall_comment": "建設的かつ前向きなアドバイス（200字程度）"
  },
  "axes": [
    {
      "id": 1,
      "name": "傾聴と共感",
      "comment": "この評価軸の総合コメント（100〜200字）",
      "indicators": [
        {"id": "1.1", "observed": true,  "evidence": "観察された発言の引用"},
        {"id": "1.2", "observed": false, "evidence": "観察されなかった理由を簡潔に"},
        {"id": "1.3", "observed": true,  "evidence": "観察された発言の引用"},
        {"id": "1.4", "observed": false, "evidence": "観察されなかった理由を簡潔に"},
        {"id": "1.5", "observed": true,  "evidence": "観察された発言の引用"}
      ],
      "improvements": [
        {
          "proposal": "改善すべき点と方向性",
          "next_action": "次の1on1ですぐに試せる具体的なアクションを1つ"
        }
      ]
    }
    // 評価軸2〜10も同様
  ]
}"""


def build_prompt(transcript_text: str) -> str:
    indicators_section = _build_indicators_section()
    json_schema = _build_json_schema_example()

    return f"""\
以下の1on1セッションのトランスクリプトを分析してください。
話者は「マネジャー」と「部下」です。マネジャーの関わり方を中心に評価してください。

## トランスクリプト
{transcript_text}

## 評価指標一覧
{indicators_section}

## 分析指示

以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

各評価軸について：
- indicators の各項目を「observed: true/false」で評価してください
- observed: true の場合は evidence に具体的な発言を引用してください
- observed: false の場合は evidence に観察されなかった理由を簡潔に記述してください
- improvements は各評価軸に1〜2点、具体的・実践的な内容で記述してください

```json
{json_schema}
```
"""


# ---------------------------------------------------------------------------
# メイン分析関数
# ---------------------------------------------------------------------------
def analyze_manager_session(utterances: list[dict]) -> dict:
    """
    1on1セッションのトランスクリプトをClaude APIで分析する。

    utterances の speaker は「マネジャー」「部下」であることを前提とする。

    Returns dict with:
        overall_summary, strengths_improvements, axes (with score computed)
    """
    transcript_lines = []
    for utt in utterances:
        start_min = utt["start"] // 60000
        start_sec = (utt["start"] // 1000) % 60
        timestamp = f"[{start_min:02d}:{start_sec:02d}]"
        transcript_lines.append(f"{timestamp} {utt['speaker']}: {utt['text']}")

    transcript_text = "\n".join(transcript_lines)

    prompt = build_prompt(transcript_text)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    logger.info(f"[manager_analyzer] stop_reason={message.stop_reason}, output_tokens={message.usage.output_tokens}")

    if message.stop_reason == "max_tokens":
        raise RuntimeError("Claude のレスポンスがトークン上限に達し、JSONが不完全です。セッションを短くして再試行してください。")

    response_text = message.content[0].text

    # JSONブロックを抽出
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0].strip()
    else:
        json_str = response_text.strip()

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        import re
        json_str_fixed = re.sub(r'(?<!\\)\n', '\\n', json_str)
        result = json.loads(json_str_fixed)

    # -----------------------------------------------------------------------
    # 各評価軸：指標充足率 → スコア の後処理
    # -----------------------------------------------------------------------
    axis_map = {a["id"]: a for a in ALL_AXES}

    for axis in result.get("axes", []):
        axis_id = axis["id"]
        indicators = axis.get("indicators", [])
        total = len(indicators)
        observed = sum(1 for ind in indicators if ind.get("observed", False))

        rate = observed / total if total > 0 else 0.0
        axis["fulfillment_rate"] = round(rate, 3)
        axis["score"] = fulfillment_to_score(rate)

        # 定義からICF対応・説明を補完
        if axis_id in axis_map:
            axis.setdefault("icf", axis_map[axis_id]["icf"])
            axis.setdefault("description", axis_map[axis_id]["description"])

    return result
