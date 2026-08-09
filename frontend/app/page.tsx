import Link from 'next/link'
import { Shippori_Mincho } from 'next/font/google'
import { LightModeGuard } from '@/app/components/LightModeGuard'

// 見出し用の明朝体（本文は既存のゴシックのまま）
const shippori = Shippori_Mincho({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const displayFont = {
  fontFamily: "var(--font-display), 'Hiragino Mincho ProN', 'Yu Mincho', serif",
}

// マーカー強調（添削ペンのモチーフ。文字の下半分に色を敷く）
function Marker({ children, color = 'var(--purple-l)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: `linear-gradient(transparent 62%, ${color} 62%)` }}>{children}</span>
  )
}

// セクション見出し（左揃え・英字eyebrow＋明朝見出しで統一）
function SectionHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mb-10">
      <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-[var(--purple)]">
        <span className="inline-block w-6 h-px bg-[var(--purple)]" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3 leading-snug" style={displayFont}>
        {title}
      </h2>
      {lead && <p className="text-gray-600 mt-4 max-w-2xl leading-relaxed">{lead}</p>}
    </div>
  )
}

// 登録CTAバンド（長ページの離脱対策として中間に2箇所配置）
function CtaBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 text-center">
      <p className="text-xl md:text-2xl font-bold text-gray-900 mb-6" style={displayFont}>
        {children}
      </p>
      <Link href="/register" className="btn-primary text-base px-8 py-3 inline-block">
        無料で始める（1クレジット付）
      </Link>
    </section>
  )
}

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-white ${shippori.variable}`}>
      <LightModeGuard />
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--purple)] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">Coachmark</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              ログイン
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* Hero（記録用紙のドットグリッドを敷く） */}
      <section
        className="relative"
        style={{
          backgroundImage: 'radial-gradient(var(--purple-l) 1.2px, transparent 1.2px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-block bg-white border border-[var(--purple)] text-[var(--purple)] text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
            ICFコアコンピテンシー（2025年版）の考え方を取り入れた独自評価軸
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 leading-snug md:leading-snug mb-8"
            style={displayFont}
          >
            AIがセッションを分析し、
            <br />
            <span className="relative inline-block">
              あなたの成長を記録し続ける。
              {/* 添削ペンの手書き風アンダーライン */}
              <svg
                className="absolute left-0 -bottom-1 md:-bottom-2 w-full"
                height="10"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 2 7 Q 28 3.5 54 6 T 98 4.5"
                  fill="none"
                  stroke="var(--purple)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
            コーチとしての成長を、科学的に。
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
            ICFコアコンピテンシー（2025年版）を参考にした独自基準の分析を重ねるたび、
            <br className="hidden sm:block" />
            スコア推移・変化コメント・成長レポートが蓄積。分析を&quot;点&quot;で終わらせない。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              無料で始める（1クレジット付）
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              ログインする
            </Link>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <SectionHeader eyebrow="FEATURES" title="このツールの特徴" />
        <div className="grid md:grid-cols-3 md:divide-x divide-gray-200 divide-y md:divide-y-0">
          {[
            {
              title: '2025年最新版の評価基準',
              desc: 'ICFコアコンピテンシー2025年9月改訂版の考え方をいち早く取り入れた独自の評価基準で、あなたのセッションを評価します。',
            },
            {
              title: '3層構造の改善提案',
              desc: 'ICFメンターコーチングコンピテンシーの考え方を参考に、「改善提案・具体的な言い換え例・次のアクション」の3層で提示。',
            },
            {
              title: '続けるほど深まる成長記録',
              desc: '分析のたびに前回からの変化やスコア推移が自動で蓄積。目標資格を設定すれば、評価基準が資格に合わせて切り替わります。',
            },
          ].map((item) => (
            <div key={item.title} className="py-6 md:py-2 md:px-8 first:md:pl-0 last:md:pr-0 first:pt-0 last:pb-0">
              <h3 className="text-lg font-bold text-gray-900" style={displayFont}>
                <Marker>{item.title}</Marker>
              </h3>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features: 分析の流れ（5ステップ + コンピテンシーチップ） */}
      <section className="bg-[var(--bg)] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader eyebrow="HOW IT WORKS" title="分析の流れ" />
          {/* 01〜04はどのツールにもある工程、05がCoachmarkの本領（色で区別） */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-8">
            {[
              {
                step: '01',
                title: '音声アップロード',
                desc: 'mp3/mp4/m4a形式の音声ファイルをアップロード。最大500MBまで対応。',
              },
              {
                step: '02',
                title: '自動文字起こし',
                desc: 'AssemblyAI技術で高精度な日本語文字起こしと話者分離を実行。',
              },
              {
                step: '03',
                title: 'AI分析',
                desc: 'Claude AIがICF PCC/MCC基準を参考にした独自評価軸で8つのコンピテンシーを評価。',
              },
              {
                step: '04',
                title: 'PDFレポート',
                desc: 'レーダーチャート付きの詳細レポートをダウンロード。改善点も明示。',
              },
              {
                step: '05',
                title: '成長トラッキング',
                desc: '分析を重ねるごとに、前回からの変化・スコア推移・成長レポートが蓄積。',
                highlight: true,
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`border-t-2 pt-4 ${item.highlight ? 'border-[var(--purple)]' : 'border-gray-300'}`}
              >
                <div
                  className={`text-2xl font-semibold mb-2 ${item.highlight ? 'text-[var(--purple)]' : 'text-gray-400'}`}
                  style={displayFont}
                >
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">
                  {item.highlight ? <Marker>{item.title}</Marker> : item.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ICF 8 competencies（STEP 03 の評価対象をコンパクトに提示） */}
          <div className="mt-12">
            <p className="text-sm font-semibold text-gray-500 mb-4">
              STEP 03 のAI分析で評価する8つの観点（ICFコアコンピテンシーを参考にした独自評価軸）
            </p>
            <div className="flex flex-wrap gap-2 max-w-4xl">
              {[
                '倫理に従った実践',
                'コーチングマインドセットの体現',
                '合意内容の確立と維持',
                '信頼と安心感の育成',
                'プレゼンスの維持',
                '積極的傾聴',
                '気づきの喚起',
                'クライアントの成長の促進',
              ].map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700"
                >
                  <span className="text-[var(--purple)] font-semibold" style={displayFont}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Growth tracking */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            eyebrow="GROWTH TRACKING"
            title="分析するたび、成長が「見える」ダッシュボード"
            lead="1回ごとのレポートで終わらせず、前回からの変化・スコアの推移・半期ごとの成長までを自動で記録。続けるほど、あなたの成長曲線がはっきり見えてきます。"
          />

          {/* Dashboard mock UI（実画面の簡略イメージ。ウィンドウクローム付き） */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden max-w-4xl mx-auto shadow-sm">
            <div className="bg-white border-b border-gray-200 flex items-center px-4 py-2.5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
              </div>
              <span className="mx-auto text-xs text-gray-400">Coachmark — ダッシュボード</span>
            </div>
            <div className="bg-[var(--bg)] p-4 sm:p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Left: 差分コメント + スコア推移 */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-[var(--teal)]">
                    <p className="text-xs font-bold text-[var(--teal)] mb-1.5">📈 前回からの変化（7/12の分析より）</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      前回課題だった二重質問が3回→1回に減り、沈黙を待てる場面が増えています。「積極的傾聴」は3.2→3.8に上昇しました。
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm flex-1">
                    <p className="text-xs font-bold text-gray-700 mb-2">スコア推移</p>
                    <svg viewBox="0 0 260 96" className="w-full" role="img" aria-label="スコア推移グラフのイメージ">
                      {[
                        { y: 12, label: '4.5' },
                        { y: 32, label: '4.0' },
                        { y: 52, label: '3.5' },
                        { y: 72, label: '3.0' },
                      ].map((t) => (
                        <g key={t.label}>
                          <line x1="26" x2="252" y1={t.y} y2={t.y} stroke="#e5e7eb" strokeWidth="1" />
                          <text x="22" y={t.y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{t.label}</text>
                        </g>
                      ))}
                      <path
                        d="M 40 62 L 90 50 L 140 56 L 190 34 L 240 22 L 240 72 L 40 72 Z"
                        fill="var(--teal)"
                        fillOpacity="0.12"
                      />
                      <path
                        d="M 40 62 L 90 50 L 140 56 L 190 34 L 240 22"
                        fill="none"
                        stroke="var(--teal)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {[
                        { x: 40, y: 62, label: '4/6' },
                        { x: 90, y: 50, label: '5/18' },
                        { x: 140, y: 56, label: '6/29' },
                        { x: 190, y: 34, label: '7/12' },
                        { x: 240, y: 22, label: '8/2' },
                      ].map((p) => (
                        <g key={p.label}>
                          <circle cx={p.x} cy={p.y} r="4" fill="var(--teal)" stroke="white" strokeWidth="1.5" />
                          <text x={p.x} y="90" textAnchor="middle" fontSize="8" fill="#9ca3af">{p.label}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Right: AIから見たあなた + 半期レポート + 成長記録PDF */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-700 mb-2">🤖 AIから見たあなた</p>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2.5">
                      問いの純度が高く、クライアントの言葉を丁寧に扱う探求型のコーチ。
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs font-semibold bg-[var(--purple-l)] text-[var(--purple)] rounded-full px-2.5 py-1">共感探求タイプ</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">🎯 目標: PCC</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-700 mb-1.5">📖 半期成長レポート</p>
                    <p className="text-xs font-bold text-[var(--purple)] mb-1">2026年上半期のハイライト</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      最も伸びたのは「気づきの喚起」。答えを急がず、クライアント自身の再定義を待てるようになった半年でした…
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-0.5">📄 成長記録PDF</p>
                      <p className="text-xs text-gray-500">全分析のまとめを1冊に。勉強会にも</p>
                    </div>
                    <span className="text-xs font-semibold bg-[var(--purple)] text-white rounded-lg px-3 py-2 shrink-0">ダウンロード</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">※画面はイメージです</p>

          {/* Journey timeline */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-8" style={displayFont}>
              Coachmarkのある半年間
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
              {[
                {
                  num: '1',
                  title: '日々の振り返りに',
                  desc: 'セッション後に通常分析。改善提案を次のセッションに活かす。',
                },
                {
                  num: '2',
                  title: '伸び悩んだら',
                  desc: 'ディープ分析で細かな癖まで"精密検査"。',
                },
                {
                  num: '3',
                  title: '半期ごとに',
                  desc: '半期成長レポートで、半年の歩みを読み物として振り返る。',
                },
                {
                  num: '4',
                  title: '資格申請前に',
                  desc: '成長記録PDFで総まとめ。提出セッション選びの判断材料に。',
                },
              ].map((item) => (
                <div key={item.num} className="border-t border-gray-200 pt-4">
                  <div className="text-lg font-semibold text-[var(--purple)] mb-1.5" style={displayFont}>
                    {item.num}
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1.5">{item.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA 1 */}
      <CtaBand>
        まずは1回、<Marker>無料で</Marker>分析してみませんか？
      </CtaBand>

      {/* Analysis plans */}
      <section className="bg-[var(--bg)] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            eyebrow="PLANS"
            title="選べる2つの分析プラン"
            lead="通常分析は日々のセッション後の振り返りに。ディープ分析は、資格申請前の提出セッション選びや、伸び悩みを感じたときの&quot;精密検査&quot;に。"
          />

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900" style={displayFont}>通常分析</h3>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-3 py-1">1クレジット</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">標準AIモデルによる8コンピテンシー分析。日々の振り返りに十分な詳しさです。</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-gray-400">✓</span>PCC基準を参考にした評価項目の充足率に基づくスコア評価</li>
                <li className="flex gap-2"><span className="text-gray-400">✓</span>コンピテンシーごとの評価コメントと改善提案2〜3点</li>
                <li className="flex gap-2"><span className="text-gray-400">✓</span>レーダーチャート付きPDFレポート</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-[var(--purple)] relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900" style={displayFont}>ディープ分析</h3>
                <span className="text-xs font-medium bg-[var(--purple-l)] text-[var(--purple)] rounded-full px-3 py-1">2クレジット</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">上位AIモデルがセッション全体を熟考してから評価。見落とされがちな細かな癖まで指摘します。</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-[var(--purple)]">✓</span>通常分析のすべての内容</li>
                <li className="flex gap-2"><span className="text-[var(--purple)]">✓</span>評価コメントが発言の引用・タイムスタンプつきでより詳細に</li>
                <li className="flex gap-2"><span className="text-[var(--purple)]">✓</span>改善提案が3〜4点に増え、より繊細な指摘まで</li>
              </ul>
            </div>
          </div>

          {/* Real example comparison */}
          <h3 className="text-xl font-bold text-gray-900 mb-3" style={displayFont}>
            同じセッションを両プランで分析すると
          </h3>
          <p className="text-sm text-gray-500 mb-8">
            サンプルセッションの「気づきの喚起」に対する改善提案の実例
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-sm font-bold text-gray-500 mb-4">通常分析の指摘（2点）</div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-gray-500 font-bold shrink-0">1.</span>
                  観察・直感・経験は執着なくシェアし、クライアントへの影響を確認する
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-500 font-bold shrink-0">2.</span>
                  特定したパターンを他の場面にも広げて探求する
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-[var(--purple)]">
              <div className="text-sm font-bold text-[var(--purple)] mb-4">ディープ分析の指摘（3点）</div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-[var(--purple-m)] font-bold shrink-0">1.</span>
                  直感のシェアを&quot;手放した提供&quot;に変え、採否をクライアントに委ねる
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--purple-m)] font-bold shrink-0">2.</span>
                  <span>
                    二重質問を避け、一つの問いに絞って内省の&quot;間&quot;を確保する
                    <span className="ml-1 text-xs font-medium bg-[var(--purple-l)] text-[var(--purple)] rounded-full px-2 py-0.5 whitespace-nowrap">ディープのみ</span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--purple-m)] font-bold shrink-0">3.</span>
                  <span>
                    クライアントが生んだ再定義を、価値観のレベルまでもう一段掘り下げる
                    <span className="ml-1 text-xs font-medium bg-[var(--purple-l)] text-[var(--purple)] rounded-full px-2 py-0.5 whitespace-nowrap">ディープのみ</span>
                  </span>
                </li>
              </ul>
              <div className="mt-4 bg-[var(--purple-l)] rounded-lg p-4 text-xs text-gray-600 leading-relaxed">
                <span className="font-bold text-[var(--purple)] block mb-1">ディープ分析の言い換え例（抜粋）</span>
                「もう少し探求してもいいですか？それとも別の角度から見てみたいですか？」は選択肢提示として有効ですが、深い内省を狙う場面では「いま、どこに向かいたいですか？」と一問に絞ると思考が散らずに済みます
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            ※実際のサンプルセッションを両プランで分析した結果からの抜粋です
          </p>
        </div>
      </section>

      {/* Voices */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            eyebrow="VOICES"
            title="コーチたちは、coachmarkをこう使っている。"
            lead="資格取得を目指す受験生から、自分のコーチングを見つめ直したいコーチまで。実際に使い続けている人の声を紹介します。"
          />

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
            {/* Card A: 佐伯祥子さん */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 flex flex-col">
              <span className="self-start text-xs font-semibold bg-[var(--purple-l)] text-[var(--purple)] rounded-full px-3 py-1">
                PCC取得を目指すコーチ
              </span>
              <p className="text-lg font-bold text-gray-900 leading-relaxed mt-4" style={displayFont}>
                「リコメンドがあるので、
                <Marker>ネクストアクションにつながりやすい</Marker>
                」
              </p>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                「こういう言い方ができた、というサジェスチョンから発想を広げて考えられる。その起点としてすごく良い」
              </p>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed bg-gray-50 rounded-lg p-3">
                ACC取得後、PCCに向けて「自分に何が足りないのか」を客観的に知るために利用。分析結果は毎回すべて通読している。
              </p>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-[var(--purple-l)] text-[var(--purple)] flex items-center justify-center font-bold shrink-0" style={displayFont}>
                  佐
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">佐伯祥子さん</p>
                  <p className="text-xs text-gray-500">ICF ACC取得済 / PCC取得を目指して利用中</p>
                </div>
                <span className="ml-auto text-xs font-semibold bg-[var(--amber-l)] text-[var(--amber)] rounded-full px-2.5 py-1 whitespace-nowrap">
                  セッション提供 約440時間
                </span>
              </div>
            </div>

            {/* Card B: 井上大輝さん */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 flex flex-col">
              <span className="self-start text-xs font-semibold bg-[var(--teal-l)] text-[var(--teal)] rounded-full px-3 py-1">
                ACC受験生
              </span>
              <p className="text-lg font-bold text-gray-900 leading-relaxed mt-4" style={displayFont}>
                「忖度がなさすぎて、でも
                <Marker color="var(--teal-l)">ちゃんとフラットに言ってくれる</Marker>
                」
              </p>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                「AIだったら、良い・悪いとはっきり言ってくれる」
              </p>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed bg-gray-50 rounded-lg p-3">
                メンターコーチの評価が曖昧で、審査基準にどう届くのか掴めずにいた。coachmarkのはっきりしたフィードバックを試験対策の軸にしている。
              </p>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-[var(--teal-l)] text-[var(--teal)] flex items-center justify-center font-bold shrink-0" style={displayFont}>
                  井
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">井上大輝さん</p>
                  <p className="text-xs text-gray-500">ICF認定コーチ / ACC取得を目指して利用中</p>
                </div>
                <span className="ml-auto text-xs font-semibold bg-[var(--amber-l)] text-[var(--amber)] rounded-full px-2.5 py-1 whitespace-nowrap">
                  累計32回分析
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-8">
            ※ 掲載はご本人の許諾を得ています。分析結果は合格を保証するものではありません。
          </p>
        </div>
      </section>

      {/* CTA 2 */}
      <CtaBand>
        あなたのコーチングも、<Marker>記録</Marker>を始めよう。
      </CtaBand>

      {/* Credit system */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-xl bg-[var(--purple)] text-white text-center px-6 py-10 sm:px-10">
          <h2 className="text-2xl font-bold mb-4" style={displayFont}>クレジット制で始めやすい</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            無料登録で1クレジット付与。通常分析は1回1クレジット、より詳細なディープ分析は2クレジット消費。
            クレジットの追加購入や、さまざまな方法で獲得できます。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-sm">
            {[
              { label: '新規登録', amount: '+1', desc: 'ボーナスクレジット' },
              { label: 'フィードバック投稿', amount: 'クーポン', desc: '¥100〜¥300割引券' },
              { label: '友達紹介', amount: '+1', desc: '初回分析完了時' },
              { label: 'クレジット購入', amount: '¥500〜', desc: '1回分から購入可' },
            ].map((item) => (
              <div key={item.label} className="bg-white/15 rounded-lg px-4 py-4">
                <div className="text-xl font-bold mb-1" style={displayFont}>{item.amount}</div>
                <div className="font-semibold text-xs">{item.label}</div>
                <div className="text-white/70 text-xs mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--bg)] py-16">
        <div className="max-w-3xl mx-auto px-4">
          <SectionHeader eyebrow="FAQ" title="よくある質問" />
          <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
            {[
              {
                q: 'どんな音声ファイルに対応していますか？',
                a: 'mp3 / mp4 / m4a 形式、最大500MBまでのファイルに対応しています。Zoomなどの録音・録画データをそのままアップロードできます（mp4/m4aは自動でmp3に変換されます）。',
              },
              {
                q: '分析にはどれくらい時間がかかりますか？',
                a: '文字起こしとAI分析をあわせて数分程度です。分析中はブラウザを閉じずにお待ちください。',
              },
              {
                q: 'アップロードした音声やデータはどう扱われますか？',
                a: '音声ファイルは分析完了後に即時削除されます。文字起こしテキストは逐語録ダウンロード機能のために分析結果と共に保存され、180日後に自動削除されます。会話内容がAIの学習に使われることもありません。詳しくは「データの取り扱いについて」のページをご覧ください。',
                link: { href: '/data-policy', label: 'データの取り扱いについて →' },
              },
              {
                q: '通常分析とディープ分析、どちらを選べばいいですか？',
                a: '日々のセッション後の振り返りには通常分析（1クレジット）で十分です。資格申請前の提出セッション選びや、伸び悩みを感じたときの精密検査にはディープ分析（2クレジット）がおすすめです。',
              },
              {
                q: 'クライアントの同意は必要ですか？',
                a: 'はい。録音・録画の事実の告知と、本サービスでの分析利用について、クライアントの同意を得たうえでご利用ください。分析実行前の確認事項でもチェックをお願いしています。',
              },
              {
                q: '分析結果はICF資格審査の代わりになりますか？',
                a: 'なりません。本サービスはAIによる自動評価であり、ICF公式の審査・認定とは無関係です。合格を保証するものではなく、練習と振り返りのための参考情報としてご活用ください。',
              },
              {
                q: '無料でどこまで使えますか？',
                a: '新規登録時に1クレジットが付与されるため、通常分析を1回無料でお試しいただけます。以降は友達紹介で獲得するか、1回分¥500からのクレジット購入をご利用ください。',
              },
              {
                q: '「目標資格」の設定とは何ですか？',
                a: 'ダッシュボードで目標資格（ACC/PCC/MCC）を設定すると、評価基準がその資格に合わせて切り替わります（現在はACC基準の切り替えに対応しています）。',
              },
            ].map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex items-center justify-between gap-3 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold text-gray-900">
                    <span className="text-[var(--purple)] font-bold mr-2" style={displayFont}>Q.</span>
                    {faq.q}
                  </span>
                  <span
                    className="text-[var(--purple)] text-lg font-light shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    ＋
                  </span>
                </summary>
                <div className="pb-5 pr-8 text-sm text-gray-600 leading-relaxed">
                  {faq.a}
                  {faq.link && (
                    <Link href={faq.link.href} className="block mt-2 text-[var(--purple)] font-medium underline">
                      {faq.link.label}
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>本ツールはAI（Claude）による自動評価です。ICF資格審査の代替ではありません。</p>
          <p className="mt-1">
            評価軸はICFコアコンピテンシー・PCCマーカー（© International Coaching Federation）の考え方を参考に独自に作成したものです。当社はICFと提携・公認関係にありません。
          </p>
          <p className="mt-3 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/terms" className="underline hover:text-gray-700">
              利用規約
            </Link>
            <Link href="/data-policy" className="underline hover:text-gray-700">
              データの取り扱いについて
            </Link>
            <Link href="/tokusho" className="underline hover:text-gray-700">
              特定商取引法に基づく表記
            </Link>
            <Link href="/updates" className="underline hover:text-gray-700">
              アップデート情報
            </Link>
          </p>
          <p className="mt-2">© 2025 Coachmark</p>
        </div>
      </footer>
    </div>
  )
}
