'use client'

import { PackOption } from './constants'

export default function PurchaseConfirmModal({ option, couponCode, onCouponChange, onConfirm, onClose, loading, error }: {
  option: PackOption; couponCode: string; onCouponChange: (v: string) => void
  onConfirm: () => void; onClose: () => void; loading: boolean; error: string
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)' }}>購入内容の確認</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--purple-l)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4 }}>{option.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--purple)' }}>{option.price}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>{option.credits}クレジット</div>
          </div>
          <div>
            <label className="ds-label">クーポンコード（任意）</label>
            <input
              type="text"
              className="ds-input"
              style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              placeholder="例：FB-A1B2C3"
              value={couponCode}
              onChange={e => onCouponChange(e.target.value.toUpperCase())}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onConfirm} disabled={loading} className="btn-create" style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
              {loading ? '処理中...' : '決済へ進む'}
            </button>
            <button onClick={onClose} className="btn-cancel-sm" style={{ width: '100%' }}>キャンセル</button>
          </div>
        </div>
      </div>
    </div>
  )
}
