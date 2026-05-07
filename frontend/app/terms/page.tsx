import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">利用規約</h1>
          <p className="text-sm text-gray-500">最終更新日：2025年5月7日</p>
        </div>

        <div className="space-y-8">

          {/* 第1条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第1条（適用）</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              本利用規約（以下「本規約」といいます）は、SODEKO（以下「当社」といいます）が提供するCoachingAnalyzer（以下「本サービス」といいます）の利用条件を定めるものです。
              登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
            </p>
          </section>

          {/* 第2条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第2条（AI分析結果の免責）</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5">
              <p className="text-sm font-semibold text-amber-800">
                本サービスの分析結果はICF（国際コーチング連盟）の公式審査・認定とは一切関係ありません。
              </p>
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '本サービスが提供するICFコアコンピテンシー評価は、AIによる自動分析であり、ICF公式の資格審査・ポートフォリオ評価・MCC/PCC/ACC認定プロセスの代替ではありません。',
                '分析結果はあくまでも参考情報として提供されるものであり、実際の資格試験・審査の結果を保証するものではありません。',
                '当社は、分析結果の正確性・完全性・有用性について、いかなる保証も行いません。分析結果を参考にした行動や判断によって生じた損害について、当社は一切の責任を負いません。',
                '本サービスにおけるAI分析には、技術的な限界があります。音声品質・録音環境・セッションの内容によっては、正確な分析ができない場合があります。',
                'コーチングセッションの分析評価に関する最終判断は、ユーザー自身の責任において行ってください。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第3条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第3条（クレジット・決済）</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '本サービスでは、分析実行に「クレジット」を使用します。クレジットは新規登録時に1クレジット付与される他、Stripe決済（クレジットカード）によって購入できます。',
                '購入されたクレジットは、デジタルコンテンツの性質上、購入完了後のキャンセル・返金はお受けできません。ただし、システム障害等、当社の責に帰すべき事由によりサービスが提供できない場合はこの限りではありません。',
                '分析実行時にシステムエラーが発生した場合、消費されたクレジットは返還されます。',
                '付与されたクレジット（新規登録ボーナス・フィードバックボーナス等）は現金への換金・払い戻しはできません。',
                'クレジットの有効期限は設けていませんが、当社がサービスを終了する場合、残存クレジットについては別途お知らせします。',
                '決済処理はStripeが提供する決済システムを使用します。カード情報は当社サーバーに保存されません。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第4条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第4条（ユーザーの義務）</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                'ユーザーは、本サービスを利用するにあたり、録音・録画の対象となるクライアントに対し、録音・録画の事実および本サービスでの分析利用について事前に告知し、明示的な同意を得なければなりません。',
                'ユーザーは、クライアントのプライバシーおよび個人情報を適切に保護する責任を負います。',
                'ユーザーは、本サービスを通じて取得した分析結果を第三者に無断で開示・共有してはなりません。',
                'ユーザーは、正確な登録情報を提供し、変更が生じた場合は速やかに更新する義務を負います。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第5条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第5条（禁止事項）</h2>
            <p className="text-sm text-gray-700 mb-4">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '法令または公序良俗に違反する行為',
                '犯罪行為に関連する行為',
                'クライアントの同意を得ずに録音・録画したデータを本サービスにアップロードする行為',
                '他のユーザーのアカウントを不正に利用する行為',
                '当社のサーバーまたはネットワークに過度の負荷をかける行為',
                '本サービスの運営を妨害するおそれのある行為',
                '不正な方法でクレジットを取得しようとする行為',
                '本サービスを逆コンパイル・リバースエンジニアリングする行為',
                '本サービスを通じて得た情報を商業目的で無断使用する行為',
                'その他、当社が不適切と判断する行為',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold">✕</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第6条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第6条（サービスの変更・停止）</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '当社は、ユーザーへの事前通知なく、本サービスの内容を変更・追加・廃止することができます。',
                '当社は、システムメンテナンス・障害・天災等の事由により、本サービスを一時停止することができます。',
                '上記による損害について、当社は一切の責任を負いません。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第7条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第7条（免責事項）</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '当社は、本サービスに事実上または法律上の瑕疵（安全性・信頼性・正確性・完全性・有効性・特定の目的への適合性・セキュリティ等に関する欠陥・エラー・バグ等を含みます）がないことを明示的にも黙示的にも保証しておりません。',
                '当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重過失による場合を除き、一切の責任を負いません。',
                'ユーザーと第三者（クライアント等）との間で紛争が生じた場合、当社は一切の責任を負わず、ユーザーが自己の責任と費用で解決するものとします。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第8条 */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">第8条（準拠法・管轄裁判所）</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                '本規約の解釈にあたっては、日本法を準拠法とします。',
                '本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 text-gray-400 font-medium">{i + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* お問い合わせ */}
          <section className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">お問い合わせ</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              本規約に関するお問い合わせは、下記までご連絡ください。
            </p>
            <div className="mt-4 text-sm text-gray-700 space-y-1">
              <p>事業者名：SODEKO</p>
              <p>
                メールアドレス：
                <a href="mailto:kouhei.sodekawa@gmail.com" className="text-blue-600 hover:underline">
                  kouhei.sodekawa@gmail.com
                </a>
              </p>
            </div>
          </section>

        </div>

        <p className="text-center text-sm text-gray-400 mt-12">
          <Link href="/" className="underline hover:text-gray-600">
            トップページに戻る
          </Link>
        </p>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>本ツールはAI（Claude）による自動評価です。ICF資格審査の代替ではありません。</p>
          <p className="mt-2">© 2025 CoachingAnalyzer</p>
        </div>
      </footer>
    </div>
  )
}
