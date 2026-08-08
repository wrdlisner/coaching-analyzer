'use client'

import { useState } from 'react'

// 友達紹介（紹介URLコピー）
export default function ReferralCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false)

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${referralCode}`
    : `/register?ref=${referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4, marginTop: 0 }}>友達を紹介する</h2>
      <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12, marginTop: 0 }}>
        紹介した友達が初回分析を完了すると、あなたに <span style={{ fontWeight: 600, color: 'var(--purple)' }}>+1クレジット</span> が付与されます
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '10px 14px' }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referralUrl}</span>
        <button onClick={handleCopy} style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          {copied ? 'コピー済み' : 'URLをコピー'}
        </button>
      </div>
    </div>
  )
}
