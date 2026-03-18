import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
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

      {/* Credit system */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">クレジット制で始めやすい</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            無料登録で1クレジット付与。1回の分析に1クレジット消費。
            フィードバック投稿やXシェアでクレジットを獲得できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
            {[
              { label: '新規登録', amount: '+1', desc: 'ボーナスクレジット' },
              { label: 'フィードバック投稿', amount: '+1', desc: 'クレジット獲得' },
              { label: 'Xシェア', amount: '+1', desc: 'クレジット獲得' },
            ].map((item) => (
              <div key={item.label} className="bg-white/20 rounded-lg px-6 py-4">
                <div className="text-2xl font-bold">{item.amount}</div>
                <div className="font-semibold">{item.label}</div>
                <div className="text-blue-200 text-xs">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>本ツールはAI（Claude）による自動評価です。ICF資格審査の代替ではありません。</p>
          <p className="mt-3">
            <Link href="/data-policy" className="underline hover:text-gray-700">
              データの取り扱いについて
            </Link>
          </p>
          <p className="mt-2">© 2025 CoachingAnalyzer</p>
        </div>
      </footer>
    </div>
  )
}
