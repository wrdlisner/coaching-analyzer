"""Claude API によるICFコンピテンシー分析モジュール（v4: ICF 2025版対応・改善提案3層構造化）"""

import json
import logging

import anthropic

logger = logging.getLogger(__name__)

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, ICF_COMPETENCIES

# ---------------------------------------------------------------------------
# 分析エンジンバージョン
# 運用ルール: プロンプト・マーカー定義・スコアリングロジックを変更するときは
# 必ずこの値をバンプすること（セッションに保存され、グラフの境界線表示や
# 「標準 · v2.0」等のバッジ表記に使われる）。
# メタデータ導入前の旧セッション（DB上NULL）は表示層で v2.0 / standard 扱い。
# ---------------------------------------------------------------------------
ENGINE_VERSION = "2.1"  # 2.1: ACC評価モード・差分コメントを追加

# 評価モード（ユーザーの目標資格に応じて評価軸を切り替える）
EVAL_MODE_STANDARD = "standard"
EVAL_MODE_ACC = "acc"
EVAL_MODE_LABELS = {"standard": "標準", "acc": "ACC"}

# ---------------------------------------------------------------------------
# PCC相当の評価軸定義（コンピテンシー3〜8）
# ICF PCC Markers（© International Coaching Federation）の考え方を参考に、
# 本ツール独自の表現で記述した評価項目。ICF公式文書の転載・翻訳ではない。
# 各項目が観察対象とする行動はPCCマーカーと対応しており、IDの対応関係も維持している。
# コンピテンシー1・2はPCC公式マーカーが存在しないため総合評価
# ---------------------------------------------------------------------------
PCC_MARKERS: dict[int, list[dict]] = {
    3: [
        {"id": "3.1", "text": "クライアントが今日のセッションで得たい成果を、対話の中で明確にしている"},
        {"id": "3.2", "text": "その成果が達成できたとどう分かるか（判断のものさし）をクライアントと話し合っている"},
        {"id": "3.3", "text": "そのテーマがクライアントにとってなぜ大切なのかを掘り下げている"},
        {"id": "3.4", "text": "成果にたどり着くために今日何を扱う必要があるかをクライアントと整理している"},
        {"id": "3.05", "text": "コーチとクライアントの協働関係がうまく機能しているかに注意を払っている（2025年版で追加された観点）"},
    ],
    4: [
        {"id": "4.1", "text": "クライアントならではの強み・気づき・取り組みを言葉にして尊重を示している"},
        {"id": "4.2", "text": "クライアントを気にかける姿勢（サポート・共感・関心）が応答から伝わっている"},
        {"id": "4.3", "text": "クライアントが感情・懸念・考え・提案を口にしたとき、否定せず受け止めて後押ししている"},
        {"id": "4.4", "text": "コーチ側の発言に対してクライアントが自由に反応できる余地をつくり、どんな反応もそのまま受け入れている"},
    ],
    5: [
        {"id": "5.1", "text": "目の前の課題だけでなく、クライアントという人そのもの（価値観・あり方）に応答している"},
        {"id": "5.2", "text": "クライアントがこのセッションで得たい成果を見失わずに関わり続けている"},
        {"id": "5.3", "text": "セッションの進め方や扱う内容を、コーチではなくクライアントが選べるようにしている"},
        {"id": "5.4", "text": "クライアントをもっと理解しようとする好奇心が関わりに表れている"},
        {"id": "5.5", "text": "沈黙や間をすぐに埋めず、クライアントが考える時間として活かしている"},
    ],
    6: [
        {"id": "6.1", "text": "質問や観察の共有が、それまでにクライアントから聴き取った内容を踏まえたものになっている"},
        {"id": "6.2", "text": "クライアントが選んだ言葉・表現そのものを取り上げて掘り下げている"},
        {"id": "6.3", "text": "クライアントの感情に触れ、そこを掘り下げている"},
        {"id": "6.4", "text": "声のトーンやエネルギーの変化、言葉にならないサインに気づいて取り上げている"},
        {"id": "6.5", "text": "クライアントがいま自分や世界をどう捉えているか（ものの見方）を探っている"},
        {"id": "6.6", "text": "クライアントの話を途中で遮らず最後まで聴いている（コーチングの意図がある介入を除く）"},
        {"id": "6.7", "text": "聴き取った内容を簡潔に言い換え・要約して返している"},
        {"id": "6.06", "text": "複数セッションにわたる傾向・パターンを踏まえて今回の傾聴に活かしている（2025年版で追加された観点）"},
    ],
    7: [
        {"id": "7.1", "text": "クライアントの考え方・感情・価値観・望み・信念・行動そのものについて問いかけている"},
        {"id": "7.2", "text": "クライアントが自分自身について、いまの捉え方の外側に出るような問いを投げかけている"},
        {"id": "7.3", "text": "クライアントが状況について、新しい見方が生まれるような問いを投げかけている"},
        {"id": "7.4", "text": "望む未来・成果に向けて思考や行動が広がるような問いを投げかけている"},
        {"id": "7.5", "text": "コーチの観察や直感を押し付けにならない形で共有し、クライアントの探求の材料にしている"},
        {"id": "7.6", "text": "問いはオープンで一度に一つずつ、クライアントが考え・感じる余裕のあるペースで投げかけている"},
        {"id": "7.7", "text": "コーチの言葉づかいが平易で簡潔である"},
        {"id": "7.8", "text": "会話の大半をクライアントが話せるようにしている"},
        {"id": "7.08", "text": "クライアントの行動・思考・感情のパターンに影響している要因に光を当てている（2025年版で追加された観点）"},
    ],
    8: [
        {"id": "8.1", "text": "冒頭に合意した成果への進み具合を、クライアント自身が振り返るよう促している"},
        {"id": "8.2", "text": "このセッションで自分自身について何が分かったかを、クライアントが言語化するよう促している"},
        {"id": "8.3", "text": "このセッションで状況について何が分かったかを、クライアントが言語化するよう促している"},
        {"id": "8.4", "text": "得られた気づきを今後どう活かすかを、クライアントが考えるよう促している"},
        {"id": "8.5", "text": "セッション後に何を考え・試すかをクライアントと一緒に設計している"},
        {"id": "8.6", "text": "前進のための資源・サポート・想定される障害をクライアントと一緒に検討している"},
        {"id": "8.7", "text": "決めたことをどう実行し続けるか（振り返り・報告の仕組み）をクライアントと一緒に決めている"},
        {"id": "8.8", "text": "クライアントの前進や学びを言葉にして承認している"},
        {"id": "8.9", "text": "セッションの締めくくり方をクライアントと一緒に決めている"},
        {"id": "8.07", "text": "コーチング期間全体を通じた学びの定着と進捗の持続を支援している（2025年版で追加された観点）"},
    ],
}

# ---------------------------------------------------------------------------
# ACC 評価項目定義（コンピテンシー3〜8）
# ICF ACC Minimum Skills Requirements をベースに、PCCマーカーより基礎的・
# 行動観察可能なレベルに落とした評価項目。PCC_MARKERSと同一構造なので、
# 充足率→スコア変換などの後処理はそのまま流用できる。
# ユーザーの目標資格が ACC のとき、この評価軸に切り替わる（evaluation_mode="acc"）。
# ---------------------------------------------------------------------------
ACC_MARKERS: dict[int, list[dict]] = {
    3: [
        {"id": "A3.1", "text": "コーチはクライアントがこのセッションで扱いたいトピックを確認する"},
        {"id": "A3.2", "text": "コーチはセッションの成果（何を得たいか）についてクライアントと合意する"},
        {"id": "A3.3", "text": "コーチはセッション中、合意したトピック・成果に沿って関わり続ける（外れた場合は立ち返る）"},
    ],
    4: [
        {"id": "A4.1", "text": "コーチはクライアントの発言・視点を尊重し、批判や否定をしない"},
        {"id": "A4.2", "text": "コーチはクライアントへの関心・サポートを言葉や相槌で示す"},
        {"id": "A4.3", "text": "コーチはクライアントが安心して話せる雰囲気を維持する"},
    ],
    5: [
        {"id": "A5.1", "text": "コーチはクライアントの発言内容に応答して関わる（用意した質問の消化になっていない）"},
        {"id": "A5.2", "text": "コーチはクライアントに好奇心を向けて関わる"},
        {"id": "A5.3", "text": "コーチは適度な間・沈黙を許容する"},
    ],
    6: [
        {"id": "A6.1", "text": "コーチはクライアントの発言を遮らずに聴く"},
        {"id": "A6.2", "text": "コーチはクライアントの発言を反映・要約して確認する"},
        {"id": "A6.3", "text": "コーチはクライアントの言葉や感情に言及して探求する"},
        {"id": "A6.4", "text": "コーチの傾聴がクライアント中心である（コーチの興味・関心中心になっていない）"},
    ],
    7: [
        {"id": "A7.1", "text": "コーチは主にオープンクエスチョンを使う"},
        {"id": "A7.2", "text": "コーチは一度に一つの質問をする"},
        {"id": "A7.3", "text": "コーチは誘導的でなく、クライアント自身の探求を促す質問をする"},
        {"id": "A7.4", "text": "コーチは助言・提案ではなく質問を中心に関わる"},
    ],
    8: [
        {"id": "A8.1", "text": "コーチはクライアントがセッションの学び・気づきを言語化するよう促す"},
        {"id": "A8.2", "text": "コーチはクライアントがセッション後の行動を決めるよう支援する"},
        {"id": "A8.3", "text": "コーチはクライアントが自ら行動を選択できるようにする（押し付けない）"},
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
            status, label, icon = "pass", "参考水準を満たしています", "◎"
        elif diff <= 0.5:
            status, label, icon = "close", "あと少し", "△"
        else:
            status, label, icon = "needs_work", "要練習", "×"
        result.append({"name": name, "threshold": threshold, "status": status, "label": label, "icon": icon, "avg_score": avg_score})

    # MCC: PCCマーカー充足率 >= 80% かつ MCC質的評価平均 >= 4.5
    mcc_display_score = mcc_avg_score if mcc_avg_score is not None else avg_score
    if pcc_fulfillment_rate >= 0.80 and mcc_avg_score is not None:
        diff = 4.5 - mcc_avg_score
        if diff <= 0:
            status, label, icon = "pass", "参考水準を満たしています", "◎"
        elif diff <= 0.5:
            status, label, icon = "close", "あと少し", "△"
        else:
            status, label, icon = "needs_work", "要練習", "×"
    else:
        status, label, icon = "needs_work", "要練習", "×"
    result.append({"name": "MCC", "threshold": 4.5, "status": status, "label": label, "icon": icon, "avg_score": mcc_display_score})

    return result


# ---------------------------------------------------------------------------
# プロンプト生成ヘルパー
# ---------------------------------------------------------------------------
def _build_markers_prompt_section(markers_map: dict[int, list[dict]], marker_label: str) -> str:
    lines = []
    for comp_id, markers in markers_map.items():
        lines.append(f"\n**コンピテンシー{comp_id}（{COMP_NAMES[comp_id]}）の{marker_label}**")
        for m in markers:
            lines.append(f"  {m['id']}: {m['text']}")
    return "\n".join(lines)


def _build_comp3_markers_example(markers_map: dict[int, list[dict]]) -> str:
    """コンピテンシー3のmarkers配列のJSON例を評価軸のIDから動的生成する"""
    lines = []
    for i, m in enumerate(markers_map[3]):
        observed = "true " if i % 2 == 0 else "false"
        evidence = "観察された発言の引用" if i % 2 == 0 else "観察されなかった理由を簡潔に"
        comma = "," if i < len(markers_map[3]) - 1 else ""
        lines.append(f'        {{{{"id": "{m["id"]}", "observed": {observed.strip()}, "evidence": "{evidence}"}}}}{comma}')
    return "\n".join(lines)


def _build_comp_json_schema(markers_map: dict[int, list[dict]]) -> str:
    """JSON出力スキーマの例を生成（コンピテンシー1・2と3〜8で形式が異なる）"""
    comp12_example = """\
    {{
      "id": 1,
      "name": "倫理に従った実践",
      "score": 3,
      "comment": "総合評価コメント（200〜400字）",
      "quotes": ["発言引用1", "発言引用2"],
      "improvements": [
        {{
          "proposal": "ICFコアコンピテンシー（2025年版）の観点からの改善内容",
          "mentor_advice": "実際の発言を引用した具体的な言い換え例（ICF MC C5-5：非審判的なフィードバック）",
          "next_action": "次のセッションで試せる具体的なアクション"
        }}
      ]
    }},
    {{
      "id": 2,
      "name": "コーチングマインドセットの体現",
      "score": 3,
      "comment": "総合評価コメント（200〜400字）",
      "quotes": ["発言引用1", "発言引用2"],
      "improvements": [
        {{
          "proposal": "ICFコアコンピテンシー（2025年版）の観点からの改善内容",
          "mentor_advice": "実際の発言を引用した具体的な言い換え例（ICF MC C5-5：非審判的なフィードバック）",
          "next_action": "次のセッションで試せる具体的なアクション"
        }}
      ]
    }}"""

    comp38_example = f"""\
    {{{{
      "id": 3,
      "name": "合意内容の確立と維持",
      "comment": "コンピテンシー全体の評価コメント（100〜200字）",
      "markers": [
{_build_comp3_markers_example(markers_map)}
      ],
      "improvements": [
        {{{{
          "proposal": "ICFコアコンピテンシー（2025年版）の観点からの改善内容",
          "mentor_advice": "実際の発言を引用した具体的な言い換え例（ICF MC C5-5：非審判的なフィードバック）",
          "next_action": "次のセッションで試せる具体的なアクション"
        }}}}
      ]
    }}}}"""

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
あなたはICF（国際コーチング連盟）認定のマスターコーチ兼メンターコーチであり、\
コーチングセッションの評価エキスパートです。

以下のルールに従ってコーチングセッションを分析してください：

1. 後述の評価項目リスト（ICF PCC Markers 2021年改訂版およびICFコアコンピテンシー2025年改訂版の考え方を参考に本ツールが独自に定義した評価軸）を使用すること
   - コンピテンシー2の評価では、テクノロジーを含む最新のコーチングベストプラクティスへの意識（2.02）も考慮すること
2. すべて日本語で出力すること
3. 評価は具体的な発言の引用に基づくこと
4. 批判的かつ建設的なフィードバックを行うこと
5. コンピテンシー1・2は総合評価（スコア1〜5）、コンピテンシー3〜8はPCCマーカー単位で評価すること
6. 発言を引用する際、人名・会社名・地名などの固有名詞は必ず伏字にすること（例：「田中さん」→「クライアントさん」、「株式会社○○」→「クライアントの会社」、地名は「ある地域」など）
7. 改善提案は非審判的なスタイルで、ICFメンターコーチングコンピテンシー（2024年版）C5（Facilitates Client's Skill Development）の観点から具体的に記述すること
"""


def build_prompt(
    transcript_text: str,
    is_follow_up: bool,
    deep: bool = False,
    evaluation_mode: str = EVAL_MODE_STANDARD,
    prev_summary: str | None = None,
) -> str:
    session_type_note = "継続セッション（2回目以降）" if is_follow_up else "初回セッション"
    is_acc = evaluation_mode == EVAL_MODE_ACC
    markers_map = ACC_MARKERS if is_acc else PCC_MARKERS
    marker_label = "ACC評価項目（ミニマムスキル要件ベース）" if is_acc else "PCCマーカー"
    markers_section = _build_markers_prompt_section(markers_map, marker_label)
    comp12_ex, comp38_ex, mcc_ex = _build_comp_json_schema(markers_map)
    if is_acc:
        # ACC評価モードではMCC質的評価を行わないため、スキーマ例も空にする
        mcc_ex = '{{"axes": []}}'

    improvements_count = "3〜4点" if deep else "2〜3点"
    deep_dive_schema = ""
    deep_instruction = ""
    if deep:
        deep_instruction = """\

【ディープ分析モード】
このセッションは詳細分析の対象です。以下を追加で守ってください：
- comment はより詳細に記述すること（コンピテンシー1・2は300〜500字、3〜8は150〜300字）
- quotes・evidence の引用は前後の文脈がわかる長さで、できるだけ具体的に含めること
- mentor_advice には言い換え例に加えて、その関わりがなぜ効果的か（ICFコンピテンシー上の意図）を1文添えること
- 出力JSONの末尾に deep_dive オブジェクトを必ず含めること。これは通常分析にはない「総合考察」であり、\
個別コンピテンシーの指摘を超えて、セッション全体を俯瞰した根本パターン・いま最優先で取り組むべき重点テーマ1つ・\
次のセッションで試す具体的な練習プランを示すこと
"""
        deep_dive_schema = """,
  "deep_dive": {
    "core_patterns": "セッション全体を貫く根本的なパターンや、繰り返し現れたコーチの癖・強みについての考察（200〜300字）",
    "focus_theme": {
      "title": "いま最も伸ばすべき重点テーマ（15字程度の短いフレーズ）",
      "detail": "なぜこのテーマを最優先にすべきかを、ICFコアコンピテンシーの観点から深掘りして説明（200〜300字）"
    },
    "practice_steps": ["次のセッションですぐ試せる具体的な練習ステップ1", "練習ステップ2", "練習ステップ3"]
  }"""

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

    # 前回分析の要約（差分コメント生成用）。初回分析（prev_summaryなし）では
    # セクションもスキーマも出さない = diff_comment は生成されない
    prev_section = ""
    diff_comment_schema = ""
    diff_instruction = ""
    if prev_summary:
        prev_section = f"""
## 前回分析の要約
{prev_summary}
"""
        diff_comment_schema = ',\n  "diff_comment": "前回分析との比較コメント（1〜2文・80字程度）"'
        diff_instruction = """
diff_comment には「## 前回分析の要約」との比較を記述してください。\
前回の改善指摘テーマに必ず言及し、今回改善が見られた場合は具体的な行動を挙げて認め、\
まだ課題が残る場合は非審判的に伝えてください\
（例：「前回指摘の『合意の確認』、今回はセッション冒頭で丁寧に行えています」）。
"""

    # 評価軸に応じた表記
    axis_word = "ACC評価項目" if is_acc else "PCCマーカー"
    if is_acc:
        qual_note = "目標資格ACCの参考基準（平均スコア3.0）を中心に、"
        mcc_section = """
## MCC質的評価
ACC評価モードのため、MCC質的評価は行いません。mcc_evaluationは必ず {"axes": []} としてください。
"""
        mcc_closing_note = "mcc_evaluationのaxesは常に空配列（[]）にしてください（ACC評価モード）。"
    else:
        qual_note = ""
        mcc_section = """
## MCC質的評価軸（コンピテンシー3〜8のPCCマーカー全体の充足率が80%以上の場合のみ評価）
- mcc1「介入の少なさ」: コーチの発言が短く、クライアントの思考を遮らない
- mcc2「質問の深さ」: 表面的な確認ではなく、クライアントの本質的な変容を促す問いかけ
- mcc3「クライアントの自律性」: クライアント自身が気づき・決断・行動を選択している
- mcc4「存在としてのコーチ」: 技術ではなく、コーチの「在り方」から自然に湧き出る関わり
- mcc5「セッションの流れ」: 構造に依存せず、クライアントのニーズに完全に応じた柔軟な展開
"""
        mcc_closing_note = (
            "mcc_evaluationは、コンピテンシー3〜8の全PCCマーカーの充足率が80%未満の場合は"
            "axesを空配列（[]）にしてください。"
        )

    # コンピテンシー一覧（評価軸のID範囲から動的生成）
    comp_list_lines = [
        f"1. 倫理に従った実践{comp1_note}（総合評価）",
        "2. コーチングマインドセットの体現（総合評価）",
    ]
    for cid in range(3, 9):
        ids = markers_map[cid]
        note = comp3_note if cid == 3 else ""
        comp_list_lines.append(f"{cid}. {COMP_NAMES[cid]}{note}（{axis_word}{ids[0]['id']}〜{ids[-1]['id']}）")
    comp_list_text = "\n".join(comp_list_lines)

    return f"""\
以下のコーチングセッションのトランスクリプトを分析してください。

## セッション種別
{session_type_note}
{follow_up_instruction}{deep_instruction}
## トランスクリプト
{transcript_text}
{prev_section}
## 評価対象{axis_word}一覧
{markers_section}
{mcc_section}
## 分析指示

以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

【重要・JSON構文の厳守】文字列値の中では半角ダブルクォート（"）を絶対に使わないでください。\
発言の引用など括弧で囲みたい場合は、必ず日本語のかぎ括弧「」を用いてください\
（半角ダブルクォートを値の中に入れるとJSONが壊れ、分析が失敗します）。

コンピテンシー1・2は総合スコア（1〜5）で評価し、コンピテンシー3〜8は\
各{axis_word}を「observed: true/false」で評価してください。
{diff_instruction}
improvements（改善提案）は各コンピテンシー{improvements_count}、以下の3層構造のオブジェクト配列で記述してください：
- proposal: 何をどう改善すべきか（ICFコアコンピテンシー2025年版の観点から）
- mentor_advice: ICFメンターコーチングコンピテンシーC5に基づき、実際のセッションの発言を引用しながら「ここでこう言い換えるとより良かった」という具体的な言い回し例（非審判的スタイル）。発言例を引用する際は必ず日本語のかぎ括弧「」で囲み、半角ダブルクォート（"）は使わないこと。
- next_action: すぐに実践できる具体的なアクションを1つ

```json
{{
  "overall_summary": "セッション全体の総評（200字程度）",
  "qualification_comment": "{qual_note}参考スコア水準に関するコメント。「合格」「不合格」などの断定表現は使わず、現在のスコアと伸ばすべき点を具体的に記述（80〜120字）",
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
  "mcc_evaluation": {mcc_ex}{deep_dive_schema}{diff_comment_schema}
}}
```

コンピテンシー一覧：
{comp_list_text}

{mcc_closing_note}
"""


# ---------------------------------------------------------------------------
# JSON 修復ヘルパー
# ---------------------------------------------------------------------------
def _repair_json(s: str) -> str:
    """文字列値内のエスケープされていないダブルクォートを補修する。

    Claude が稀に mentor_advice 等の文字列値の中で「"発言例"」のように半角クォートを
    混入させ、JSONが壊れる（Expecting ',' delimiter）ことがある。
    文字列の途中に現れる " のうち、直後の非空白文字が構造的デリミタ（, } ] : または末尾）
    でないものを、文字列内のリテラルとみなして \\" にエスケープする。
    """
    out: list[str] = []
    in_string = False
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if not in_string:
            out.append(c)
            if c == '"':
                in_string = True
            i += 1
            continue
        # 文字列内
        if c == '\\':
            # エスケープシーケンスは2文字まとめてそのまま通す
            out.append(c)
            if i + 1 < n:
                out.append(s[i + 1])
                i += 2
            else:
                i += 1
            continue
        if c == '"':
            # 直後の非空白文字で文字列の終端かどうかを判定する
            j = i + 1
            while j < n and s[j] in ' \t\r\n':
                j += 1
            if j >= n or s[j] in ',}]:':
                out.append(c)          # 正当な終端
                in_string = False
            else:
                out.append('\\"')      # 値の中のリテラルクォート → エスケープ
            i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


# ---------------------------------------------------------------------------
# メイン分析関数
# ---------------------------------------------------------------------------
def analyze_session(
    utterances: list[dict],
    is_follow_up: bool = False,
    model: str | None = None,
    deep: bool = False,
    evaluation_mode: str = EVAL_MODE_STANDARD,
    prev_summary: str | None = None,
) -> dict:
    """
    文字起こし結果をClaude APIで分析する。

    標準モード: PCCマーカー充足率からスコアを算出し、80%以上の場合はMCC質的評価も行う。
    ACCモード（evaluation_mode="acc"）: ACC評価項目に切り替え、MCC評価は対象外。

    Args:
        model: 使用するClaudeモデルID。未指定時は config.CLAUDE_MODEL。
        deep: ディープ分析モード（上位モデル向け。詳細なコメント・改善提案を生成）
        evaluation_mode: "standard" | "acc"。ユーザーの目標資格から呼び出し側が決定
        prev_summary: 前回分析の要約テキスト。指定時は diff_comment（前回からの差分
            コメント）が結果に含まれる。初回分析では None

    Returns dict with:
        overall_summary, qualification_comment, strengths_improvements,
        competencies (with markers for 3-8, score computed from fulfillment),
        pcc_fulfillment_rate, mcc_evaluation, diff_comment (prev_summary指定時のみ)
    """
    # トランスクリプトをテキスト化
    transcript_lines = []
    for utt in utterances:
        start_min = utt["start"] // 60000
        start_sec = (utt["start"] // 1000) % 60
        timestamp = f"[{start_min:02d}:{start_sec:02d}]"
        transcript_lines.append(f"{timestamp} {utt['speaker']}: {utt['text']}")

    transcript_text = "\n".join(transcript_lines)

    model = model or CLAUDE_MODEL

    # [LOG] Step 3: confirm is_follow_up received in analyzer
    logger.info(f"[analyzer] analyze_session called: model={model}, deep={deep}, is_follow_up={is_follow_up}, mode={evaluation_mode}, has_prev={prev_summary is not None}, utterances={len(utterances)}")

    prompt = build_prompt(transcript_text, is_follow_up, deep=deep, evaluation_mode=evaluation_mode, prev_summary=prev_summary)

    # [LOG] Step 4: confirm session type line appears in prompt
    session_type_line = next((l for l in prompt.splitlines() if "セッション種別" in l or "初回" in l or "継続" in l), "NOT FOUND")
    logger.info(f"[analyzer] prompt session_type_note: {session_type_line.strip()}")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    request_kwargs: dict = dict(
        model=model,
        max_tokens=32000 if deep else 16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    if deep:
        # ディープ分析では適応的思考を有効化（思考トークンはmax_tokensに含まれる）
        request_kwargs["thinking"] = {"type": "adaptive"}

    # 大きいmax_tokensでもHTTPタイムアウトしないようストリーミングで受信する
    with client.messages.stream(**request_kwargs) as stream:
        message = stream.get_final_message()

    logger.info(f"[analyzer] stop_reason={message.stop_reason}, output_tokens={message.usage.output_tokens}")

    if message.stop_reason == "max_tokens":
        raise RuntimeError("Claude のレスポンスがトークン上限に達し、JSONが不完全です。セッションを短くして再試行してください。")

    # thinking ブロックが先頭に来る場合があるため、text ブロックを探して抽出する
    response_text = next((b.text for b in message.content if b.type == "text"), None)
    if response_text is None:
        raise RuntimeError("Claude のレスポンスにテキストが含まれていません。")

    # JSONブロックを抽出
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0].strip()
    else:
        json_str = response_text.strip()

    # Claude が稀に文字列値内に生の改行や、エスケープされていないダブルクォートを
    # 出力するため、strict=False（制御文字許容）→ クォート修復 の順に救済する
    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        try:
            result = json.loads(json_str, strict=False)
        except json.JSONDecodeError:
            result = json.loads(_repair_json(json_str), strict=False)

    # -----------------------------------------------------------------------
    # マーカー充足率 → スコア の後処理（PCC/ACCとも同一構造なので共通）
    # -----------------------------------------------------------------------
    markers_map = ACC_MARKERS if evaluation_mode == EVAL_MODE_ACC else PCC_MARKERS
    total_markers = 0
    total_observed = 0

    for comp in result.get("competencies", []):
        comp_id = comp["id"]
        if comp_id in markers_map:
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

    if evaluation_mode == EVAL_MODE_ACC:
        # ACC評価モードではMCC質的評価は対象外（プロンプトでも除外済みだが念のため固定）
        mcc_eval["axes"] = []
        mcc_eval["avg_score"] = None
        mcc_eval["is_mcc_eligible"] = False
        mcc_eval["reason"] = "ACC評価モードのためMCC評価対象外"
    elif pcc_fulfillment_rate >= 0.80 and mcc_axes:
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
