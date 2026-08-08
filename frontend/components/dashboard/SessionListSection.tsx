'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sessions, SessionSummary } from '@/lib/api'
import { formatDate, formatDuration, normalizeEngine } from '@/lib/format'

// セッション一覧（行クリックでレポートへ・評価モードバッジ・逐語録DLアイコン）
export default function SessionListSection({ sessionList }: { sessionList: SessionSummary[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownloadTranscript = async (e: React.MouseEvent, s: SessionSummary) => {
    // 行のLink遷移と分離
    e.preventDefault()
    e.stopPropagation()
    if (downloadingId) return
    setDownloadingId(s.id)
    try {
      const blob = await sessions.downloadTranscript(s.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date(s.created_at).toISOString().slice(0, 10).replace(/-/g, '')
      a.href = url
      a.download = `transcript_${dateStr}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('逐語録のダウンロードに失敗しました')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>過去のセッション</h2>
      {sessionList.length === 0 ? (
        <div className="ds-card" style={{ textAlign: 'center', padding: '3rem 1.25rem' }}>
          <p style={{ color: 'var(--txt3)', marginBottom: 16 }}>まだ分析したセッションはありません</p>
          <Link href="/analyze" className="btn-create">最初の分析を始める</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sessionList.map(s => (
            <Link key={s.id} href={`/report/${s.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="ds-card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '14px 16px', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
              >
                <div>
                  <div className="session-date" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {formatDate(s.created_at)}
                    <span className="engine-badge">{normalizeEngine(s).label}</span>
                  </div>
                  <div className="session-meta">
                    <span>⏱ {formatDuration(s.duration_seconds)}</span>
                    <span>💬 コーチ発話 {s.coach_ratio}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: `${(s.avg_score / 5.0) * 100}%` }} />
                    </div>
                    <div className="score-sub">平均スコア / 5.0</div>
                  </div>
                  <div className="score-val">{s.avg_score.toFixed(1)}</div>
                  <button
                    onClick={e => handleDownloadTranscript(e, s)}
                    disabled={!s.has_transcript || downloadingId === s.id}
                    title={s.has_transcript ? '逐語録をダウンロード（.docx）' : 'この分析には逐語録がありません'}
                    aria-label="逐語録をダウンロード"
                    style={{
                      background: 'none', border: 'none', fontSize: 18, padding: 4,
                      cursor: s.has_transcript ? 'pointer' : 'default',
                      opacity: s.has_transcript ? (downloadingId === s.id ? 0.4 : 1) : 0.25,
                    }}
                  >
                    📄
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
