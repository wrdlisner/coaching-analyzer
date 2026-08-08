'use client'

import { useState } from 'react'
import { auth, UserInfo, ProfileInsightPayload } from '@/lib/api'

// 目標資格のラベル（本人カードでは icf_level を「目標資格」として扱う）
// TODO: 選択肢の範囲は暫定（引き継ぎ書§4）。ACC/PCC/MCC/目標なしの4択
const GOAL_LABELS: Record<string, string> = {
  none: '目標なし', acc: 'ACC', pcc: 'PCC', mcc: 'MCC',
}
const GOAL_OPTIONS = ['acc', 'pcc', 'mcc', 'none'] as const

// 本人カード: 名前・AIによる一言(tagline)・目標資格バッジ・タイプ診断バッジ・分析回数
export default function PersonCard({ user, insight, sessionCount, onUserUpdate }: {
  user: UserInfo
  insight: ProfileInsightPayload | null
  sessionCount: number
  onUserUpdate: (u: UserInfo) => void
}) {
  const [selecting, setSelecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSelectGoal = async (level: string) => {
    if (saving) return
    setSaving(true); setError('')
    try {
      const updated = await auth.updateProfile({ icf_level: level })
      onUserUpdate(updated)
      setSelecting(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'var(--purple-l)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--purple)', flexShrink: 0,
        }}>
          {user.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>{user.name}</h2>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '4px 0 10px' }}>
            {insight?.tagline || '分析を重ねると、AIから見たあなたのコーチ像がここに表示されます'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="goal-badge"
              onClick={() => { setSelecting(v => !v); setError('') }}
              title="クリックで目標資格を変更"
            >
              🎯 目標: {GOAL_LABELS[user.icf_level] || user.icf_level} ▾
            </button>
            {insight?.archetype && (
              <span className="type-badge">{insight.archetype.label}</span>
            )}
            <span style={{ fontSize: 12, color: 'var(--txt3)' }}>分析 {sessionCount} 回</span>
          </div>
          {selecting && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)' }}>
              <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '0 0 8px' }}>
                目標資格を選ぶと、評価基準がその資格に合わせて切り替わります（現在はACCに対応）
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GOAL_OPTIONS.map(level => (
                  <button
                    key={level}
                    onClick={() => handleSelectGoal(level)}
                    disabled={saving}
                    className={user.icf_level === level ? 'btn-create' : 'btn-cancel-sm'}
                    style={{ fontSize: 12, opacity: saving ? 0.6 : 1 }}
                  >
                    {GOAL_LABELS[level]}
                  </button>
                ))}
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--coral)', margin: '8px 0 0' }}>{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
