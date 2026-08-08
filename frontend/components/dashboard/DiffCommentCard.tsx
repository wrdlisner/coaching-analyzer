'use client'

import { SessionSummary } from '@/lib/api'

// ホーム用: 最新分析の「前回からの差分コメント」（ログイン直後に成長の証拠が目に入る位置）
// 初回分析のみ・差分コメント未生成（旧分析）の場合は何も表示しない
export default function DiffCommentCard({ sessionList }: { sessionList: SessionSummary[] }) {
  // APIは新しい順
  const latest = sessionList[0]
  const diff = latest?.scores?.diff_comment
  if (!diff?.text) return null

  const prevDate = diff.prev_created_at
    ? new Date(diff.prev_created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    : null

  return (
    <div className="ds-card" style={{ marginBottom: '0.75rem', borderLeft: '3px solid var(--teal)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', margin: '0 0 6px' }}>
        📈 前回からの変化{prevDate ? `（${prevDate}の分析より）` : ''}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, lineHeight: 1.7 }}>{diff.text}</p>
    </div>
  )
}
