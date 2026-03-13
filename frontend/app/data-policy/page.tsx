import Link from 'next/link'

export default function DataPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← トップページ
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">データの取り扱いについて</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            アップロードされた音声データがどのように処理・削除されるかを説明します。
            クライアントのプライバシー保護を最優先に設計しています。
          </p>
        </div>

        {/* Flow diagram */}
        <div className="bg-white rounded-2xl shadow p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-center">データのライフサイクル</h2>

          {/* Steps */}
          <div className="relative">
            {/* Horizontal connector line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gray-200" />

            <div className="grid md:grid-cols-5 gap-4">
              {[
                {
                  num: '01',
                  label: 'アップロード',
                  desc: '音声ファイルを選択してサーバーに送信',
                  color: 'bg-blue-100 text-blue-600 border-blue-200',
                  dot: 'bg-blue-500',
                },
                {
                  num: '02',
                  label: '形式変換',
                  desc: 'mp4/m4aの場合、mp3に変換（サーバー上）',
                  color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
                  dot: 'bg-indigo-500',
                },
                {
                  num: '03',
                  label: '文字起こし',
                  desc: 'AssemblyAI APIで音声を文字に変換・話者分離',
                  color: 'bg-purple-100 text-purple-600 border-purple-200',
                  dot: 'bg-purple-500',
                },
                {
                  num: '04',
                  label: 'AI分析',
                  desc: 'Claude AIがICF 8コンピテンシーを評価',
                  color: 'bg-violet-100 text-violet-600 border-violet-200',
                  dot: 'bg-violet-500',
                },
                {
                  num: '05',
                  label: '完了・削除',
                  desc: 'スコアをDBに保存。音声・文字起こしは即削除',
                  color: 'bg-green-100 text-green-700 border-green-200',
                  dot: 'bg-green-500',
                },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex md:flex-col items-start md:items-center gap-3 md:gap-0 relative">
                  {/* Circle */}
                  <div className={`relative z-10 w-16 h-16 shrink-0 rounded-full border-2 ${step.color} flex items-center justify-center md:mb-3`}>
                    <span className="text-lg font-bold">{step.num}</span>
                  </div>
                  {/* Arrow for mobile */}
                  {i < arr.length - 1 && (
                    <div className="md:hidden text-gray-300 text-2xl font-bold self-center">↓</div>
                  )}
                  <div className="md:text-center">
                    <p className="font-semibold text-gray-800 text-sm mb-1">{step.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deletion callout */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <div className="text-green-600 text-xl mt-0.5">✓</div>
            <div>
              <p className="font-semibold text-green-800 text-sm">分析完了後、音声・文字起こしデータは即時削除されます</p>
              <p className="text-xs text-green-700 mt-1">
                PDFレポートが生成された時点で、サーバー上の音声ファイルおよび文字起こしテキストは完全に削除されます。
                クライアントの会話内容がサービス内に残ることはありません。
              </p>
            </div>
          </div>
        </div>

        {/* What is and isn't stored */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Not stored */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">✕</span>
              <h3 className="font-semibold text-gray-900">保存されないデータ</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: '音声ファイル', desc: 'アップロードされたmp3/mp4/m4aファイル' },
                { label: '文字起こしテキスト', desc: 'セッションの会話内容すべて' },
                { label: 'クライアントの発言', desc: 'AIに送った文字起こしデータ' },
                { label: '個人を特定できる情報', desc: '名前・連絡先などの会話中の個人情報' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Stored */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">✓</span>
              <h3 className="font-semibold text-gray-900">保存されるデータ</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: 'ICFコンピテンシースコア（数値）', desc: '8つのコンピテンシーの1〜5点のスコア' },
                { label: 'セッション時間・発話比率', desc: 'コーチとクライアントの発話時間の割合' },
                { label: '平均スコア', desc: '全コンピテンシーの平均値' },
                { label: 'アカウント情報', desc: '登録時に入力した名前・メールアドレス' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-xs">✓</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
              保存されたスコアデータはマイページの分析履歴で確認できます。会話の内容は一切含まれません。
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">よくある質問</h2>
          <div className="space-y-6">
            {[
              {
                q: 'クライアントの会話内容がAIの学習データに使われますか？',
                a: 'いいえ。Claude API（Anthropic社）は、APIを通じて送信されたデータをモデルの学習に使用しません。AssemblyAI APIについても同様に、APIデータは学習には使用されません。',
              },
              {
                q: '音声ファイルはいつ削除されますか？',
                a: 'PDFレポートの生成が完了した直後に、サーバー上の音声ファイルおよび文字起こしテキストを削除します。分析に失敗した場合も同様に即時削除します。',
              },
              {
                q: 'クライアントに録音の同意を得る必要がありますか？',
                a: 'はい。本サービスの利用にあたり、クライアントへの録音・録画の告知と同意取得を必須条件としています。分析実行前の確認事項チェックリストでも確認していただいています。',
              },
              {
                q: 'データはどのサーバーに保存されますか？',
                a: 'バックエンドサーバーおよびデータベースはRailway（米国）上でホスティングされています。音声・文字起こしデータは処理後に即削除されるため、長期保存されることはありません。',
              },
            ].map((faq, i) => (
              <div key={i} className={i > 0 ? 'pt-6 border-t border-gray-100' : ''}>
                <p className="font-medium text-gray-900 mb-2 flex items-start gap-2">
                  <span className="text-blue-500 font-bold shrink-0">Q.</span>
                  {faq.q}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed pl-6">
                  <span className="text-gray-400 font-medium">A. </span>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/register" className="btn-primary text-base px-8 py-3 inline-block">
            無料で始める（1クレジット付）
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            ご不明な点は <a href="mailto:contact@example.com" className="underline hover:text-gray-600">お問い合わせ</a> ください
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>本ツールはAI（Claude）による自動評価です。ICF資格審査の代替ではありません。</p>
          <p className="mt-2">© 2025 CoachingAnalyzer</p>
        </div>
      </footer>
    </div>
  )
}
