import Link from 'next/link'

export default function TokushoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {[
                { label: '販売事業者名', value: 'SODEKO' },
                { label: '代表者名', value: '袖川航平' },
                { label: '所在地', value: '東京都中野3-9-4' },
                { label: '電話番号', value: '090-8432-2182' },
                { label: 'メールアドレス', value: 'kouhei.sodekawa@gmail.com' },
                { label: 'サービス名', value: 'CoachingAnalyzer' },
                {
                  label: '販売価格',
                  value: '各商品ページに表示された価格（消費税込み）\n・1回分クレジット：¥500\n・3回分クレジット：¥1,200\n・10回分クレジット：¥3,500',
                },
                {
                  label: '支払方法',
                  value: 'クレジットカード（Stripe決済）\nVisa / Mastercard / American Express / JCB',
                },
                {
                  label: '支払時期',
                  value: '購入手続き完了時に即時決済',
                },
                {
                  label: 'サービス提供時期',
                  value: '決済完了後、即時にクレジットが付与されます',
                },
                {
                  label: 'キャンセル・返品について',
                  value: 'デジタルコンテンツの性質上、購入完了後のキャンセル・返金はお受けできません。ただし、システム障害等により当社の責に帰すべき事由でサービスが提供できない場合はこの限りではありません。',
                },
                {
                  label: '動作環境',
                  value: '最新バージョンのGoogle Chrome / Safari / Firefox / Microsoft Edge（インターネット接続環境が必要です）',
                },
                {
                  label: '特記事項',
                  value: '本サービスはAIによる自動分析であり、ICF（国際コーチング連盟）の公式審査・認定とは一切関係ありません。分析結果はご参考情報としてお取り扱いください。',
                },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium bg-gray-50 w-40 align-top shrink-0">
                    {label}
                  </th>
                  <td className="px-6 py-4 text-gray-800 whitespace-pre-line">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          <Link href="/" className="underline hover:text-gray-600">
            トップページに戻る
          </Link>
        </p>
      </main>
    </div>
  )
}
