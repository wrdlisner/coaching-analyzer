'use client'

import { PACK_OPTIONS } from './constants'

// クレジット購入プラン（3枚グリッド）。モーダルの開閉は親が管理
export default function CreditPurchaseCard({ onSelect, note }: {
  onSelect: (pack: '1' | '3' | '10') => void
  note?: string
}) {
  return (
    <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: note ? 4 : 12, marginTop: 0 }}>クレジットを購入</h2>
      {note && <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '0 0 12px' }}>{note}</p>}
      <div className="credit-plans">
        {PACK_OPTIONS.map(opt => (
          <button
            key={opt.pack}
            className={`plan${opt.pack === '3' ? ' featured' : ''}`}
            onClick={() => onSelect(opt.pack)}
          >
            <span className="plan-label">{opt.label}</span>
            <span className="plan-price">{opt.price}</span>
            <span className="plan-credits">{opt.credits}クレジット</span>
            {opt.save && <span className="plan-save">{opt.save}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
