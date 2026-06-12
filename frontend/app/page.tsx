import Link from 'next/link'
import { LightModeGuard } from '@/app/components/LightModeGuard'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <LightModeGuard />
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-block bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          ICFコアコンピテンシー（2025年最新版）準拠
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
          AIがセッションを評価し、
          <br />
          <span className="text-blue-600">メンターコーチが伴走する。</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
          コーチとしての成長を、科学的に。
        </p>
        <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
          ICFコアコンピテンシー（2025年最新版）×<br />
          ICFメンターコーチングコンピテンシーに基づく、<br />
          世界唯一のコーチング分析ツール。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base px-8 py-3">
            無料で始める（1クレジット付）
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3">
            ログインする
          </Link>
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-blue-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-xl font-bold text-center text-gray-900 mb-8">このツールの特徴</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-blue-600 font-bold text-sm mb-2">ICFコアコンピテンシー 2025年最新版</div>
              <p className="text-sm text-gray-600">2025年9月改訂版に基づく最新の評価基準で、あなたのセッションを正確に評価します。</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-blue-600 font-bold text-sm mb-2">3層構造の改善提案</div>
              <p className="text-sm text-gray-600">ICFメンターコーチングコンピテンシーを活用した「改善提案・具体的な言い換え例・次のアクション」の3層で提示。</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-blue-600 font-bold text-sm mb-2">メンターコーチが伴走</div>
              <p className="text-sm text-gray-600">AIの分析レポートをもとに、メンターコーチとの対話で気づきをより深く実践に繋げられます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">分析の流れ</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: '音声アップロード',
              desc: 'mp3/mp4/m4a形式の音声ファイルをアップロード。最大500MBまで対応。',
              color: 'bg-blue-100 text-blue-600',
            },
            {
              step: '02',
              title: '自動文字起こし',
              desc: 'AssemblyAI技術で高精度な日本語文字起こしと話者分離を実行。',
              color: 'bg-indigo-100 text-indigo-600',
            },
            {
              step: '03',
              title: 'AI分析',
              desc: 'Claude AIがICF PCC/MCC基準に基づき8つのコンピテンシーを評価。',
              color: 'bg-purple-100 text-purple-600',
            },
            {
              step: '04',
              title: 'PDFレポート',
              desc: 'レーダーチャート付きの詳細レポートをダウンロード。改善点も明示。',
              color: 'bg-pink-100 text-pink-600',
            },
          ].map((item) => (
            <div key={item.step} className="card text-center">
              <div
                className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center mx-auto mb-4`}
              >
                <span className="text-lg font-bold">{item.step}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ICF Competencies */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            評価するICF 8つのコアコンピテンシー
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3"
              >
                <span className="text-blue-600 font-bold text-sm w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm text-gray-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis plans */}
      <section className="bg-gradient-to-b from-white to-purple-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">選べる2つの分析プラン</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            通常分析は日々のセッション後の振り返りに。
            <br className="hidden sm:block" />
            ディープ分析は、資格申請前の提出セッション選びや、伸び悩みを感じたときの&quot;精密検査&quot;に。
          </p>

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">通常分析</h3>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-3 py-1">1クレジット</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">標準AIモデルによるICF 8コンピテンシー分析。日々の振り返りに十分な詳しさです。</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-blue-500">✓</span>PCCマーカー充足率に基づくスコア評価</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span>コンピテンシーごとの評価コメントと改善提案2〜3点</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span>レーダーチャート付きPDFレポート</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-purple-300 relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">ディープ分析</h3>
                <span className="text-xs font-medium bg-purple-100 text-purple-700 rounded-full px-3 py-1">2クレジット</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">上位AIモデルがセッション全体を熟考してから評価。見落とされがちな細かな癖まで指摘します。</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-purple-500">✓</span>通常分析のすべての内容</li>
                <li className="flex gap-2"><span className="text-purple-500">✓</span>評価コメントが発言の引用・タイムスタンプつきでより詳細に</li>
                <li className="flex gap-2"><span className="text-purple-500">✓</span>改善提案が3〜4点に増え、より繊細な指摘まで</li>
              </ul>
            </div>
          </div>

          {/* Real example comparison */}
          <h3 className="text-xl font-bold text-center text-gray-900 mb-3">同じセッションを両プランで分析すると</h3>
          <p className="text-center text-sm text-gray-500 mb-8">
            サンプルセッションの「気づきの喚起」に対する改善提案の実例
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-sm font-bold text-gray-500 mb-4">通常分析の指摘（2点）</div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-gray-400 font-bold shrink-0">1.</span>
                  観察・直感・経験は執着なくシェアし、クライアントへの影響を確認する
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 font-bold shrink-0">2.</span>
                  特定したパターンを他の場面にも広げて探求する
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-purple-300">
              <div className="text-sm font-bold text-purple-700 mb-4">ディープ分析の指摘（3点）</div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">1.</span>
                  直感のシェアを&quot;手放した提供&quot;に変え、採否をクライアントに委ねる
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">2.</span>
                  <span>
                    二重質問を避け、一つの問いに絞って内省の&quot;間&quot;を確保する
                    <span className="ml-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 whitespace-nowrap">ディープのみ</span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">3.</span>
                  <span>
                    クライアントが生んだ再定義を、価値観のレベルまでもう一段掘り下げる
                    <span className="ml-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 whitespace-nowrap">ディープのみ</span>
                  </span>
                </li>
              </ul>
              <div className="mt-4 bg-purple-50 rounded-lg p-4 text-xs text-gray-600 leading-relaxed">
                <span className="font-bold text-purple-700 block mb-1">ディープ分析の言い換え例（抜粋）</span>
                「もう少し探求してもいいですか？それとも別の角度から見てみたいですか？」は選択肢提示として有効ですが、深い内省を狙う場面では「いま、どこに向かいたいですか？」と一問に絞ると思考が散らずに済みます
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            ※実際のサンプルセッションを両プランで分析した結果からの抜粋です
          </p>
        </div>
      </section>

      {/* Credit system */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">クレジット制で始めやすい</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
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
              <div key={item.label} className="bg-white/20 rounded-lg px-4 py-4">
                <div className="text-xl font-bold mb-1">{item.amount}</div>
                <div className="font-semibold text-xs">{item.label}</div>
                <div className="text-blue-200 text-xs mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>本ツールはAI（Claude）による自動評価です。ICF資格審査の代替ではありません。</p>
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
          </p>
          <p className="mt-2">© 2025 Coachmark</p>
        </div>
      </footer>
    </div>
  )
}
