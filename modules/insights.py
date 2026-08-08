"""ユーザーインサイト生成モジュール

分析結果（scores JSON）の蓄積から Claude API で生成する:
- generate_profile_insight: 「AIから見たあなた」（強み・改善テーマ・一言・繰り返し指摘）
  + コーチタイプ診断（アーキタイプ判定）を1回の呼び出しで生成
- generate_semiannual_report: 半期成長レポート（読み物形式）

逐語録は使わず scores JSON の要約のみを入力にするため、分析本体に比べて小さな呼び出しで済む。
"""

import json
import logging

import anthropic

from config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

# 分析ティアstandardと同じモデル（routers/analyze.py の ANALYSIS_TIERS と揃える）
INSIGHT_MODEL = "claude-sonnet-4-6"

# 分析3回未満のユーザーにはインサイトを生成しない
MIN_SESSIONS_FOR_INSIGHT = 3

# TODO: タイプ数・命名は暫定（引き継ぎ書§4）。フィードバックを見て調整する
ARCHETYPES = [
    {"id": "deep_listener", "label": "傾聴深掘り型", "description": "C6（傾聴）・C7（気づきの喚起）が高い。反映と問いで深く掘り下げる"},
    {"id": "companion",     "label": "伴走支援型",   "description": "C4（信頼と安心感）が高い。承認・共感でクライアントとの信頼を築く"},
    {"id": "architect",     "label": "構造設計型",   "description": "C3（合意）・C8（成長促進）が高い。合意形成と行動設計が堅実"},
    {"id": "catalyst",      "label": "気づき触発型", "description": "C7（気づきの喚起）が突出。視点転換を起こす問いが強み"},
    {"id": "space_holder",  "label": "場づくり型",   "description": "C5（プレゼンス）が高い。沈黙と間を活かした関わり"},
    {"id": "growth_driver", "label": "成長推進型",   "description": "C8（成長促進）が高い。学びの言語化と前進へのコミットを支援する"},
    {"id": "all_rounder",   "label": "バランス型",   "description": "全コンピテンシーが均等。安定した総合力"},
]

_ARCHETYPE_BY_ID = {a["id"]: a for a in ARCHETYPES}


def _summarize_sessions(sessions_data: list[dict]) -> str:
    """セッションのscores JSON群を、プロンプト用のコンパクトなテキストに要約する。

    sessions_data: [{"created_at": "YYYY-MM-DD", "avg_score": float, "scores": dict}, ...]
    （新しい順を想定）
    """
    lines = []
    for i, s in enumerate(sessions_data, 1):
        scores = s.get("scores") or {}
        comps = scores.get("competencies") or []
        comp_str = " ".join(
            f"C{c.get('id')}:{c.get('score')}" for c in comps if c.get("id")
        )
        lines.append(f"### 分析{i}（{s.get('created_at')}） 平均{s.get('avg_score', 0):.1f} {comp_str}")
        si = scores.get("strengths_improvements") or {}
        for st in (si.get("strengths") or [])[:2]:
            lines.append(f"- 強み: {st}")
        for imp in (si.get("improvements") or [])[:3]:
            lines.append(f"- 改善指摘: {imp}")
    return "\n".join(lines)


def _call_claude_json(prompt: str, max_tokens: int) -> dict:
    """Claude を呼び出してJSONレスポンスをパースする"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=INSIGHT_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next((b.text for b in message.content if b.type == "text"), "")
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip(), strict=False)


def generate_profile_insight(sessions_data: list[dict]) -> dict | None:
    """「AIから見たあなた」+ コーチタイプ診断を生成する。

    Returns（user_insights.payload に保存するdict）:
        {strengths, improvement_theme, tagline,
         archetype: {id, label} | None,
         recurring: {theme, count} | None,
         source_session_count}
    分析3回未満なら None。
    """
    if len(sessions_data) < MIN_SESSIONS_FOR_INSIGHT:
        return None

    archetype_list = "\n".join(f"- {a['id']}: {a['label']} — {a['description']}" for a in ARCHETYPES)
    summary = _summarize_sessions(sessions_data)

    prompt = f"""\
あなたはICF認定のメンターコーチです。あるコーチの直近{len(sessions_data)}回の\
コーチングセッション分析結果（新しい順）をもとに、そのコーチの人物像をまとめてください。

## 分析結果の要約
{summary}

## コーチタイプ一覧（この中から最も当てはまる1つのidを選ぶ）
{archetype_list}

## 指示
以下のJSON形式のみで出力してください。すべて日本語、非審判的で前向きなトーンで書くこと。
文字列値の中で半角ダブルクォート（"）は使わず、引用にはかぎ括弧「」を使うこと。

```json
{{
  "strengths": "このコーチの強み（1〜2文・100字程度。スコアが高いコンピテンシーと繰り返し現れる強みに基づく）",
  "improvement_theme": "いま取り組むべき改善テーマ（1〜2文・100字程度）",
  "tagline": "どんなコーチかの一言紹介（20字程度。例：傾聴で信頼を築く伴走者）",
  "archetype_id": "コーチタイプ一覧から選んだid",
  "recurring": {{"theme": "直近の分析で最も繰り返し指摘されているテーマ名（15字以内。改善指摘を意味的にグルーピングして最頻出のもの）", "count": 出現回数の整数}}
}}
```

recurring は、同じ趣旨の改善指摘が2回以上ある場合のみ設定し、なければ null にしてください。
"""

    result = _call_claude_json(prompt, max_tokens=2000)

    archetype = _ARCHETYPE_BY_ID.get(result.get("archetype_id") or "")
    recurring = result.get("recurring")
    if not (isinstance(recurring, dict) and recurring.get("theme") and isinstance(recurring.get("count"), int)):
        recurring = None

    return {
        "strengths": result.get("strengths", ""),
        "improvement_theme": result.get("improvement_theme", ""),
        "tagline": result.get("tagline", ""),
        # ラベルはサーバー側で付与（表記ゆれ防止）
        "archetype": {"id": archetype["id"], "label": archetype["label"]} if archetype else None,
        "recurring": recurring,
        "source_session_count": len(sessions_data),
    }


def generate_semiannual_report(period_label: str, sessions_data: list[dict], profile_insight: dict | None) -> dict:
    """半期成長レポート（読み物形式）を生成する。

    sessions_data は対象期間内のセッション（古い順）。
    Returns（user_insights.payload に保存するdict）:
        {highlights, improved_competencies, ongoing_challenges, next_focus,
         session_count, avg_score_start, avg_score_end}
    """
    summary = _summarize_sessions(sessions_data)
    avg_start = sessions_data[0].get("avg_score") if sessions_data else None
    avg_end = sessions_data[-1].get("avg_score") if sessions_data else None

    insight_note = ""
    if profile_insight:
        insight_note = f"""
## 参考: AIによる現在のコーチ像
- 強み: {profile_insight.get('strengths', '')}
- 改善テーマ: {profile_insight.get('improvement_theme', '')}
"""

    year, half = period_label.split("-")
    period_ja = f"{year}年{'上半期' if half == 'H1' else '下半期'}"

    prompt = f"""\
あなたはICF認定のメンターコーチです。あるコーチの{period_ja}（{len(sessions_data)}回分）の\
コーチングセッション分析結果（古い順）をもとに、本人が読んで励みになる半期成長レポートを書いてください。

## 分析結果の要約
{summary}
{insight_note}
## 指示
以下のJSON形式のみで出力してください。すべて日本語、読み物として自然な文章で、\
非審判的かつ具体的に書くこと。文字列値の中で半角ダブルクォート（"）は使わず、\
引用にはかぎ括弧「」を使うこと。

```json
{{
  "highlights": "この半期のハイライト（300字程度。スコアの変化や取り組みの変化を物語として描く）",
  "improved_competencies": [
    {{"id": コンピテンシー番号の整数, "name": "コンピテンシー名", "comment": "どう改善したか（80字程度）"}}
  ],
  "ongoing_challenges": "継続課題（150字程度）",
  "next_focus": ["次の半期の焦点候補1（30字程度）", "焦点候補2"]
}}
```

improved_competencies はスコアが実際に向上したもののみ最大3件。向上が見られなければ空配列にしてください。
"""

    result = _call_claude_json(prompt, max_tokens=3000)

    return {
        "highlights": result.get("highlights", ""),
        "improved_competencies": result.get("improved_competencies") or [],
        "ongoing_challenges": result.get("ongoing_challenges", ""),
        "next_focus": result.get("next_focus") or [],
        "session_count": len(sessions_data),
        "avg_score_start": round(avg_start, 1) if isinstance(avg_start, (int, float)) else None,
        "avg_score_end": round(avg_end, 1) if isinstance(avg_end, (int, float)) else None,
    }
