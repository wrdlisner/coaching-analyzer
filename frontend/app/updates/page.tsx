import Link from 'next/link'
import { changelog, typeLabel, typeStyle } from '@/lib/changelog'

export const metadata = {
  title: 'アップデート情報 | Coachmark',
  description: 'Coachmarkの新機能・改善・修正履歴',
}

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">Coachmark</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← トップページ
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">アップデート情報</h1>
          <p className="text-sm text-gray-500">Coachmarkの新機能・改善・修正履歴</p>
        </div>

        <div className="relative">
          {/* タイムライン縦線 */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-8">
            {changelog.map((entry, i) => (
              <div key={i} className="flex gap-6">
                {/* ドット */}
                <div className="relative shrink-0 mt-1.5">
                  <div className="w-[15px] h-[15px] rounded-full border-2 border-blue-500 bg-white" />
                </div>

                <div className="flex-1 pb-2">
                  <p className="text-sm font-semibold text-gray-500 mb-3">{entry.date}</p>
                  <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
                    {entry.changes.map((change, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyle[change.type]}`}>
                          {typeLabel[change.type]}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">{change.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <p className="mt-2">© 2025 Coachmark</p>
        </div>
      </footer>
    </div>
  )
}
