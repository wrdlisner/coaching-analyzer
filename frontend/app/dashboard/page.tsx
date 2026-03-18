'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, sessions, credits, notices, removeToken, UserInfo, SessionSummary, CreditRecord, Notice } from '@/lib/api'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}分${s}秒`
}

const REASON_LABELS: Record<string, string> = {
  analysis: '分析実行',
  feedback: 'フィードバック',
  sns_share: 'Xシェア',
  bonus: '新規登録ボーナス',
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [sessionList, setSessionList] = useState<SessionSummary[]>([])
  const [creditHistory, setCreditHistory] = useState<CreditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [noticeDismissed, setNoticeDismissed] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, sessionsData, creditsData] = await Promise.all([
          auth.getMe(),
          sessions.list(),
          credits.getHistory(),
        ])
        setUser(userData)
        setSessionList(sessionsData)
        setCreditHistory(creditsData)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
    notices.getLatest().then(setNotice).catch(() => {})
  }, [router])

  const handleDismissNotice = async () => {
    if (notice) {
      await notices.markAsRead(notice.id).catch(() => {})
      setNoticeDismissed(true)
    }
  }

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user?.name}</span>
              <span className="ml-3 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {user?.credits} クレジット
              </span>
            </div>
            {user?.is_admin && (
              <a href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                管理者ページ
              </a>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Notice banner */}
        {notice && !noticeDismissed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded">
                    NEW
                  </span>
                  <span className="text-xs text-gray-500">
                    {notice.published_at
                      ? new Date(notice.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                      : ''}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{notice.title}</p>
                <Link
                  href={`/notices/${notice.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  詳細を見る →
                </Link>
              </div>
              <button
                onClick={handleDismissNotice}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* New analysis CTA */}
        <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">新しい分析を始める</h2>
              <p className="text-blue-100 text-sm">
                1クレジット消費 / 現在 {user?.credits} クレジット保有
              </p>
            </div>
            <Link
              href="/analyze"
              className="bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              分析を開始
            </Link>
          </div>
        </div>

        {/* Sessions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">過去のセッション</h2>
          {sessionList.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">まだ分析したセッションはありません</p>
              <Link href="/analyze" className="btn-primary mt-4 inline-block">
                最初の分析を始める
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionList.map((s) => (
                <Link
                  key={s.id}
                  href={`/report/${s.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(s.created_at)}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDuration(s.duration_seconds)} / コーチ発話 {s.coach_ratio}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {s.avg_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">平均スコア / 5.0</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Credit history */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">クレジット履歴</h2>
          {creditHistory.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">クレジット履歴はありません</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">日時</th>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">理由</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">変動</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {creditHistory.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {REASON_LABELS[c.reason] || c.reason}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-semibold ${
                          c.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {c.amount > 0 ? `+${c.amount}` : c.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
