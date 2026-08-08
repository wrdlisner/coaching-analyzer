'use client'

import { UserInfo, CreditRecord, CouponInfo } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { REASON_LABELS, reasonBadgeClass } from './constants'
import CreditPurchaseCard from './CreditPurchaseCard'
import ReferralCard from './ReferralCard'

// アカウント設定（折りたたみ）: クレジット購入・保有クーポン・友達紹介・クレジット履歴
export default function AccountSettingsAccordion({ user, couponList, creditHistory, onSelectPack }: {
  user: UserInfo
  couponList: CouponInfo[]
  creditHistory: CreditRecord[]
  onSelectPack: (pack: '1' | '3' | '10') => void
}) {
  return (
    <details className="acct-accordion">
      <summary>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>⚙️ アカウント設定</span>
        <span style={{ fontSize: 12, color: 'var(--txt3)' }}>クレジット購入・クーポン・友達紹介・履歴</span>
      </summary>
      <div style={{ paddingTop: 12 }}>
        <CreditPurchaseCard onSelect={onSelectPack} />

        {couponList.length > 0 && (
          <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>保有クーポン</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {couponList.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--purple-l)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--txt)' }}>{c.code}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>¥{c.discount_amount} OFF</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {new Date(c.expires_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}まで
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.referral_code && <ReferralCard referralCode={user.referral_code} />}

        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>クレジット履歴</h2>
          {creditHistory.length === 0 ? (
            <div className="ds-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--txt3)' }}>クレジット履歴はありません</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>理由</th>
                    <th style={{ textAlign: 'right' }}>変動</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--txt3)', fontSize: 12 }}>{formatDate(c.created_at)}</td>
                      <td>
                        <span className={reasonBadgeClass(c.reason)}>
                          {REASON_LABELS[c.reason] || c.reason}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: c.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                        {c.amount > 0 ? `+${c.amount}` : c.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </details>
  )
}
