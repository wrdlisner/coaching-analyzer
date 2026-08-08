'use client'

import { ProfileInsightPayload } from '@/lib/api'

// 「AIから見たあなた」: 強み・改善テーマ・繰り返し指摘の検出
export default function AiCommentCard({ insight }: { insight: ProfileInsightPayload | null }) {
  if (!insight) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p style={{ fontSize: 13, color: 'var(--txt3)', margin: 0 }}>
          分析を3回以上重ねると、AIがあなたの強み・改善テーマをまとめます
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', margin: '0 0 4px' }}>💪 強み</p>
        <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, lineHeight: 1.7 }}>{insight.strengths}</p>
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', margin: '0 0 4px' }}>🌱 改善テーマ</p>
        <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, lineHeight: 1.7 }}>{insight.improvement_theme}</p>
      </div>
      {insight.recurring && insight.recurring.count >= 2 && (
        <div style={{ background: 'var(--amber-l)', borderRadius: 'var(--rs)', padding: '10px 12px' }}>
          <p style={{ fontSize: 12, color: 'var(--txt2)', margin: 0 }}>
            🔁 よく指摘されるテーマ：
            <span style={{ fontWeight: 700, color: 'var(--amber)', marginLeft: 4 }}>
              {insight.recurring.theme}（{insight.recurring.count}回）
            </span>
          </p>
        </div>
      )}
      <p style={{ fontSize: 11, color: 'var(--txt3)', margin: 0 }}>
        直近{insight.source_session_count}回の分析結果から生成
      </p>
    </div>
  )
}
