'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { sessions, credits, feedback, getToken, SessionSummary } from '@/lib/api'
import { normalizeEngine } from '@/lib/format'

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
          className="bg-[var(--teal)] rounded-full h-2 transition-all"
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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)

  const handleDownloadTranscript = async () => {
    setDocxLoading(true)
    try {
      const blob = await sessions.downloadTranscript(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript_${id}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('逐語録のダウンロードに失敗しました')
    } finally {
      setDocxLoading(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login')
      return
    }
    sessions.get(id)
      .then((sessionData) => setSession(sessionData))
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
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

if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!session) return null

  const competencies = session.scores?.competencies || []
  const analysisTier = session.scores?.analysis_tier
  const engineInfo = normalizeEngine(session)
  const diffComment = session.scores?.diff_comment
  const overallSummary = session.scores?.overall_summary
  const qualificationComment = session.scores?.qualification_comment
  const strengthsImprovements = session.scores?.strengths_improvements
  const deepDive = session.scores?.deep_dive

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium">
            ← ダッシュボードに戻る
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-gray-900">分析レポート</h1>
            {/* analysis_tier はティア機能導入後のレポートにのみ存在する（過去レポートはバッジなし） */}
            {analysisTier === 'deep' && (
              <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-[var(--purple-l)] text-[var(--purple)]">
                ディープ分析
              </span>
            )}
            {analysisTier === 'standard' && (
              <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
                通常分析
              </span>
            )}
            {/* 評価モード・エンジンバージョン（旧分析は「標準 · v2.0」に正規化） */}
            <span className="engine-badge" title="この分析に使われた評価モードとエンジンバージョン">
              {engineInfo.label}
            </span>
          </div>
          <div className="w-28" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 前回からの差分コメント（2回目以降の分析のみ・レポート冒頭） */}
        {diffComment?.text && (
          <div className="card border-l-4 border-[var(--teal)]">
            <h2 className="text-sm font-bold text-[var(--teal)] mb-2">
              📈 前回からの変化
              {diffComment.prev_created_at
                ? `（${new Date(diffComment.prev_created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の分析より）`
                : ''}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{diffComment.text}</p>
          </div>
        )}

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
            <div className="bg-[var(--teal-l)] rounded-lg p-3 text-center">
              <div className="text-xs text-[var(--teal)] mb-1">平均スコア</div>
              <div className="text-2xl font-bold text-[var(--teal)]">{session.avg_score.toFixed(1)}</div>
              <div className="text-xs text-gray-500">/ 5.0</div>
            </div>
          </div>
        </div>

        {/* Overall summary */}
        {overallSummary && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-3">全体総評</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{overallSummary}</p>
            {qualificationComment && (
              <div className="mt-3 bg-[var(--purple-l)] rounded-lg px-4 py-3 text-sm text-[var(--purple)]">
                {qualificationComment}
              </div>
            )}
          </div>
        )}

        {/* ディープ分析の総合考察（ディープ分析時のみ存在。通常分析には無い章） */}
        {deepDive && (deepDive.core_patterns || deepDive.focus_theme?.title || deepDive.focus_theme?.detail || (deepDive.practice_steps && deepDive.practice_steps.length > 0)) && (
          <div className="card border-2 border-[var(--purple-l)] bg-[var(--purple-l)]/40">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-[var(--purple)]">ディープ分析による総合考察</h2>
              <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-[var(--purple-l)] text-[var(--purple)]">
                ディープ分析限定
              </span>
            </div>
            <p className="text-xs text-[var(--purple-m)] mb-4">
              ※ この考察は通常分析には含まれない、ディープ分析だけの総合的な深掘りです。
            </p>

            <div className="space-y-5">
              {deepDive.core_patterns && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">セッション全体を貫くパターン</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{deepDive.core_patterns}</p>
                </div>
              )}

              {(deepDive.focus_theme?.title || deepDive.focus_theme?.detail) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">いま最も伸ばすべき重点テーマ</h3>
                  {deepDive.focus_theme?.title && (
                    <div className="inline-block rounded-md bg-[var(--purple-l)] text-[var(--purple)] text-sm font-semibold px-3 py-1 mb-2">
                      {deepDive.focus_theme.title}
                    </div>
                  )}
                  {deepDive.focus_theme?.detail && (
                    <p className="text-sm text-gray-700 leading-relaxed">{deepDive.focus_theme.detail}</p>
                  )}
                </div>
              )}

              {deepDive.practice_steps && deepDive.practice_steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">次のセッションで試す練習ステップ</h3>
                  <ol className="space-y-2">
                    {deepDive.practice_steps.map((step, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--purple)] text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competency scores */}
        {competencies.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">コンピテンシー別スコア</h2>
            <div className="space-y-3">
              {competencies.map((c) => (
                <div key={c.id} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-[var(--purple-l)] text-[var(--purple)] text-xs font-bold flex items-center justify-center shrink-0">
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

          {/* 逐語録 Word ダウンロード（逐語録保存機能導入後の分析のみ） */}
          {session.has_transcript && (
            <div>
              <button
                onClick={handleDownloadTranscript}
                disabled={docxLoading}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                {docxLoading ? '生成中...' : '📄 逐語録をダウンロード（Word）'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                AIによる自動文字起こしのため誤りを含む場合があります。ご自身で編集できる素材としてご活用ください。
              </p>
            </div>
          )}

          {/* Mentor coaching CTA */}
          <div className="border border-[var(--teal-l)] rounded-lg p-4 bg-[var(--teal-l)]">
            <p className="font-semibold text-gray-900 mb-1">
              📋 このレポートをメンターコーチングで活用しませんか？
            </p>
            <p className="text-sm text-gray-600 mb-3">
              レポートをもとにメンターコーチと対話することで、
              気づきをより深く実践に繋げることができます。
            </p>
            <Link
              href="/mentors"
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
            フィードバックを送る（クーポンがもらえる）
          </Link>

        </div>
      </main>
    </div>
  )
}
