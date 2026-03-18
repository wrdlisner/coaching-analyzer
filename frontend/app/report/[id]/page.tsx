'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { sessions, credits, feedback, getToken, SessionSummary } from '@/lib/api'

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

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-500 rounded-full h-2 transition-all"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{score}/5</span>
    </div>
  )
}

export default function ReportPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [session, setSession] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [showShareInput, setShowShareInput] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.push('/login')
      return
    }
    Promise.all([
      sessions.get(id),
      credits.getHistory(),
    ]).then(([sessionData, creditHistory]) => {
      setSession(sessionData)
      if (creditHistory.some((c) => c.reason === 'sns_share')) {
        setShareSuccess(true)
      }
    }).catch(() => router.push('/dashboard')).finally(() => setLoading(false))
  }, [id, router])

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/sessions/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('PDF download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coaching_report_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDFのダウンロードに失敗しました')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleShareX = () => {
    const text = encodeURIComponent(
      `ICFコーチングセッションをAI分析しました！平均スコア: ${session?.avg_score.toFixed(1)}/5.0\n#ICFコーチング #コーチング分析`
    )
    const url = encodeURIComponent('https://coaching-analyzer.example.com')
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
    setShowShareInput(true)
  }

  const handleConfirmShare = async () => {
    if (!shareUrl.trim()) return
    setShareLoading(true)
    try {
      await feedback.confirmShare(id, shareUrl)
      setShareSuccess(true)
      setShowShareInput(false)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'シェア確認に失敗しました')
    } finally {
      setShareLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!session) return null

  const competencies = session.scores?.competencies || []
  const overallSummary = session.scores?.overall_summary
  const qualificationComment = session.scores?.qualification_comment
  const strengthsImprovements = session.scores?.strengths_improvements

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="font-bold text-gray-900">分析レポート</h1>
          <div className="w-28" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Session meta */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">セッション情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">分析日時</div>
              <div className="text-sm font-medium">{formatDate(session.created_at)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">セッション時間</div>
              <div className="text-sm font-medium">{formatDuration(session.duration_seconds)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">コーチ発話比率</div>
              <div className="text-sm font-medium">{session.coach_ratio}%</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-500 mb-1">平均スコア</div>
              <div className="text-2xl font-bold text-blue-600">{session.avg_score.toFixed(1)}</div>
              <div className="text-xs text-gray-400">/ 5.0</div>
            </div>
          </div>
        </div>

        {/* Overall summary */}
        {overallSummary && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-3">全体総評</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{overallSummary}</p>
            {qualificationComment && (
              <div className="mt-3 bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800">
                {qualificationComment}
              </div>
            )}
          </div>
        )}

        {/* Competency scores */}
        {competencies.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">コンピテンシー別スコア</h2>
            <div className="space-y-3">
              {competencies.map((c) => (
                <div key={c.id} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {c.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 mb-1 truncate">{c.name}</div>
                    <ScoreBar score={c.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        {strengthsImprovements && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">強み・改善点</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-2">強み</h3>
                <ul className="space-y-1">
                  {strengthsImprovements.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-2">改善点</h3>
                <ul className="space-y-1">
                  {strengthsImprovements.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-500 shrink-0">!</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {strengthsImprovements.overall_comment && (
              <div className="mt-4 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
                {strengthsImprovements.overall_comment}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">アクション</h2>

          {/* PDF download */}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {pdfLoading ? '生成中...' : 'PDFをダウンロード'}
          </button>

          {/* Mentor coaching CTA */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <p className="font-semibold text-gray-900 mb-1">
              📋 このレポートをメンターコーチングで活用しませんか？
            </p>
            <p className="text-sm text-gray-600 mb-3">
              レポートをもとにメンターコーチと対話することで、
              気づきをより深く実践に繋げることができます。
            </p>
            <Link
              href="/mentor"
              className="btn-secondary w-full py-2 text-center block text-sm"
            >
              メンターコーチを探す →
            </Link>
          </div>

          {/* Feedback */}
          <Link
            href={`/feedback/${id}`}
            className="btn-secondary w-full py-3 text-center block"
          >
            フィードバックを送る (+1クレジット)
          </Link>

          {/* X share */}
          {!shareSuccess ? (
            <div>
              <button
                onClick={handleShareX}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                Xでシェアする (+1クレジット)
              </button>
              {showShareInput && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-600">
                    投稿したXのURLを入力してクレジットを獲得してください
                  </p>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://twitter.com/..."
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                  />
                  <button
                    onClick={handleConfirmShare}
                    disabled={shareLoading || !shareUrl.trim()}
                    className="btn-primary w-full"
                  >
                    {shareLoading ? '確認中...' : 'シェアを確認する'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 text-center font-semibold">
              +1クレジット獲得！ありがとうございます
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
