'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, sessions, credits, coupons, notices, payments, removeToken, UserInfo, SessionSummary, CreditRecord, Notice, CouponInfo } from '@/lib/api'

type DashTab = 'home' | 'profile'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}分${s}秒`
}

const REASON_LABELS: Record<string, string> = {
  analysis: '分析実行',
  feedback: 'フィードバック',
  bonus: '新規登録ボーナス',
  referral: '友達紹介ボーナス',
  purchase: 'クレジット購入',
}

const ICF_LEVEL_LABELS: Record<string, string> = {
  none: '未取得', acc: 'ACC', pcc: 'PCC', mcc: 'MCC',
}

function reasonBadgeClass(reason: string): string {
  if (reason === 'purchase') return 'reason-badge reason-buy'
  if (reason === 'bonus' || reason === 'referral') return 'reason-badge reason-bonus'
  if (reason === 'analysis') return 'reason-badge reason-use'
  return 'reason-badge reason-other'
}

type PackOption = { pack: '1' | '3' | '10'; label: string; price: string; credits: number; save?: string }

const PACK_OPTIONS: PackOption[] = [
  { pack: '1',  label: '1回',      price: '¥500',   credits: 1 },
  { pack: '3',  label: '3回パック', price: '¥1,200', credits: 3,  save: '¥300お得' },
  { pack: '10', label: '10回パック', price: '¥3,500', credits: 10, save: '¥1,500お得' },
]

function ScoreChart({ sessionList }: { sessionList: SessionSummary[] }) {
  if (sessionList.length === 0) return null
  const sorted = [...sessionList].reverse()
  const W = 520, H = 140
  const pL = 38, pR = 16, pT = 10, pB = 28
  const innerW = W - pL - pR
  const innerH = H - pT - pB
  const scores = sorted.map(s => s.avg_score)
  const rawMin = Math.min(...scores)
  const rawMax = Math.max(...scores)
  const yMin = Math.max(0, rawMin - 0.5)
  const yMax = Math.min(5, rawMax + 0.5)
  const range = yMax - yMin || 1
  const xAt = (i: number) => pL + (sorted.length <= 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW)
  const yAt = (v: number) => pT + innerH - ((v - yMin) / range) * innerH
  const pts = sorted.map((s, i) => ({ x: xAt(i), y: yAt(s.avg_score) }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fillPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(pT + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pT + innerH).toFixed(1)} Z`
    : ''
  const step = range / 4
  const ticks = [0, 1, 2, 3, 4].map(i => parseFloat((yMin + step * i).toFixed(1)))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} role="img" aria-label="スコア推移グラフ">
      {ticks.map(t => (
        <g key={t}>
          <line x1={pL} x2={W - pR} y1={yAt(t)} y2={yAt(t)} stroke="#e8e6df" strokeWidth="1" />
          <text x={pL - 4} y={yAt(t) + 4} textAnchor="end" fontSize="9" fill="#9c9b94">{t.toFixed(1)}</text>
        </g>
      ))}
      {fillPath && <path d={fillPath} fill="rgba(29,158,117,0.12)" />}
      {pts.length > 1 && <path d={linePath} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#1D9E75" stroke="white" strokeWidth={2} />)}
      {sorted.map((s, i) => (
        <text key={i} x={xAt(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9c9b94">
          {new Date(s.created_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
        </text>
      ))}
    </svg>
  )
}

function PurchaseConfirmModal({ option, couponCode, onCouponChange, onConfirm, onClose, loading, error }: {
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

function CreditGuideModal({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: '🎁', title: '新規登録ボーナス', desc: '登録時に +1クレジット 付与されます。' },
    {
      icon: '🎟️', title: 'フィードバック投稿でクーポン獲得',
      desc: 'セッション分析後にフィードバックを送ると、クレジット購入時に使える割引クーポンがもらえます。',
      extra: ['・通常：¥100クーポン', '・累計3回目：¥200クーポン', '・累計5回目：¥300クーポン', '（未使用5枚まで保有可能・有効期限30日）'],
    },
    { icon: '👥', title: '友達紹介ボーナス', desc: '紹介した友達が初回分析を完了すると +1クレジット 付与されます。紹介URLはこのページの「友達を紹介する」からコピーできます。' },
    { icon: '💳', title: 'クレジット購入', desc: '1回分（¥500）、3回分（¥1,200）、10回分（¥3,500）のパックから選べます。クーポンコードをお持ちの場合は購入時に入力してください。' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)' }}>クレジットの増やし方</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', margin: '0 0 4px' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>{item.desc}</p>
                {item.extra && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {item.extra.map(e => <span key={e} style={{ fontSize: 11, color: 'var(--txt3)' }}>{e}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button onClick={onClose} className="btn-create" style={{ width: '100%' }}>閉じる</button>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')

  const [activeTab, setActiveTab] = useState<DashTab>('home')
  const [user, setUser] = useState<UserInfo | null>(null)
  const [sessionList, setSessionList] = useState<SessionSummary[]>([])
  const [creditHistory, setCreditHistory] = useState<CreditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ icf_level: 'none' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [couponList, setCouponList] = useState<CouponInfo[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [showCreditGuide, setShowCreditGuide] = useState(false)
  const [selectedPack, setSelectedPack] = useState<'1' | '3' | '10' | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setIsDark(true)
    else if (stored === 'light') setIsDark(false)
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    const cls = next ? 'dark' : 'light'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(cls)
    localStorage.setItem('theme', cls)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, sessionsData, creditsData, couponsData] = await Promise.all([
          auth.getMe(), sessions.list(), credits.getHistory(), coupons.list(),
        ])
        setUser(userData)
        setProfileForm({ icf_level: userData.icf_level })
        setSessionList(sessionsData)
        setCreditHistory(creditsData)
        setCouponList(couponsData)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
    notices.getLatest().then(setNotice).catch(() => {})
  }, [router])

  const handleDismissNotice = async () => {
    if (notice) {
      await notices.markAsRead(notice.id).catch(() => {})
      setNoticeDismissed(true)
    }
  }

  const handleLogout = () => { removeToken(); router.push('/login') }

  const handlePurchase = async () => {
    if (!selectedPack) return
    setPurchaseLoading(true); setPurchaseError('')
    try {
      const { url } = await payments.createCheckout(selectedPack, couponCode.trim() || undefined)
      window.location.href = url
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : '決済の開始に失敗しました')
      setPurchaseLoading(false)
    }
  }

  const handleOpenPurchaseModal = (pack: '1' | '3' | '10') => {
    setSelectedPack(pack); setCouponCode(''); setPurchaseError('')
  }

  const handleClosePurchaseModal = () => {
    setSelectedPack(null); setCouponCode(''); setPurchaseError(''); setPurchaseLoading(false)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true); setProfileError('')
    try {
      const updated = await auth.updateProfile({ icf_level: profileForm.icf_level })
      setUser(updated); setEditingProfile(false)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setProfileSaving(false)
    }
  }

  const referralUrl = typeof window !== 'undefined' && user?.referral_code
    ? `${window.location.origin}/register?ref=${user.referral_code}`
    : user?.referral_code ? `/register?ref=${user.referral_code}` : ''

  const handleCopyReferral = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt3)', fontSize: 14 }}>読み込み中...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 14, color: 'var(--txt)' }}>
      {showCreditGuide && <CreditGuideModal onClose={() => setShowCreditGuide(false)} />}
      {selectedPack && (
        <PurchaseConfirmModal
          option={PACK_OPTIONS.find(o => o.pack === selectedPack)!}
          couponCode={couponCode}
          onCouponChange={setCouponCode}
          onConfirm={handlePurchase}
          onClose={handleClosePurchaseModal}
          loading={purchaseLoading}
          error={purchaseError}
        />
      )}

      {/* Topbar */}
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">CA</div>
          CoachingAnalyzer
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{user?.name}</span>
          <button className="credit-badge" onClick={() => setShowCreditGuide(true)}>
            ⬡ {user?.credits} クレジット
          </button>
          {user?.is_admin && <a href="/admin" className="topbar-link">管理者ページ</a>}
          <button
            onClick={toggleTheme}
            className="topbar-link"
            aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            style={{ fontSize: 16 }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="topbar-link" onClick={handleLogout}>ログアウト</button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${activeTab === 'home' ? ' active' : ''}`} onClick={() => setActiveTab('home')}>
          ホーム
        </button>
        <button className={`tab${activeTab === 'profile' ? ' active' : ''}`} onClick={() => setActiveTab('profile')}>
          プロフィール
          {sessionList.length > 0 && <span className="tab-count">{sessionList.length}</span>}
        </button>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        {/* ── ホームタブ ── */}
        {activeTab === 'home' && (
          <div>
            {/* Notice banner */}
            {notice && !noticeDismissed && (
              <div className="notif">
                <div className="notif-left">
                  <span className="notif-tag">NEW</span>
                  <span className="notif-text">{notice.title}</span>
                  <span className="notif-date">
                    {notice.published_at
                      ? new Date(notice.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                      : ''}
                  </span>
                </div>
                <button className="notif-close" onClick={handleDismissNotice} aria-label="閉じる">✕</button>
              </div>
            )}

            {/* Payment result messages */}
            {paymentStatus === 'success' && (
              <div style={{ background: 'var(--teal-l)', border: '0.5px solid var(--teal)', borderRadius: 'var(--rs)', padding: '12px 16px', fontSize: 13, color: 'var(--teal)', fontWeight: 500, marginBottom: '1.25rem' }}>
                購入完了！クレジットが追加されました。
              </div>
            )}
            {paymentStatus === 'cancel' && (
              <div style={{ background: 'var(--amber-l)', border: '0.5px solid var(--amber)', borderRadius: 'var(--rs)', padding: '12px 16px', fontSize: 13, color: 'var(--amber)', fontWeight: 500, marginBottom: '1.25rem' }}>
                購入をキャンセルしました。
              </div>
            )}

            {/* Hero banner */}
            <div className="hero">
              <div>
                <h2>新しい分析を始める</h2>
                <p>1クレジット消費 ／ 現在 {user?.credits} クレジット保有</p>
                <button className="hero-link" onClick={() => setShowCreditGuide(true)}>
                  クレジットを増やすには？→
                </button>
              </div>
              <Link href="/analyze" className="hero-btn">分析を開始</Link>
            </div>

            {/* Coupon list */}
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

            {/* Credit purchase plans */}
            <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>クレジットを購入</h2>
              <div className="credit-plans">
                {PACK_OPTIONS.map(opt => (
                  <button
                    key={opt.pack}
                    className={`plan${opt.pack === '3' ? ' featured' : ''}`}
                    onClick={() => handleOpenPurchaseModal(opt.pack)}
                  >
                    <span className="plan-label">{opt.label}</span>
                    <span className="plan-price">{opt.price}</span>
                    <span className="plan-credits">{opt.credits}クレジット</span>
                    {opt.save && <span className="plan-save">{opt.save}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Referral */}
            {user?.referral_code && (
              <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4, marginTop: 0 }}>友達を紹介する</h2>
                <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12, marginTop: 0 }}>
                  紹介した友達が初回分析を完了すると、あなたに <span style={{ fontWeight: 600, color: 'var(--purple)' }}>+1クレジット</span> が付与されます
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '10px 14px' }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referralUrl}</span>
                  <button onClick={handleCopyReferral} style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {copied ? 'コピー済み' : 'URLをコピー'}
                  </button>
                </div>
              </div>
            )}

            {/* Profile settings */}
            <div className="ds-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>プロフィール設定</h2>
                {!editingProfile && (
                  <button
                    onClick={() => { setProfileForm({ icf_level: user?.icf_level || 'none' }); setProfileError(''); setEditingProfile(true) }}
                    style={{ fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    編集
                  </button>
                )}
              </div>
              {editingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="ds-label">ICF資格レベル</label>
                    <select className="ds-input" value={profileForm.icf_level} onChange={e => setProfileForm({ ...profileForm, icf_level: e.target.value })}>
                      <option value="none">未取得</option>
                      <option value="acc">ACC</option>
                      <option value="pcc">PCC</option>
                      <option value="mcc">MCC</option>
                    </select>
                  </div>
                  {profileError && <p style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}>{profileError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSaveProfile} disabled={profileSaving} className="btn-create" style={{ flex: 1 }}>
                      {profileSaving ? '保存中...' : '保存する'}
                    </button>
                    <button onClick={() => setEditingProfile(false)} className="btn-cancel-sm" style={{ flex: 1 }}>
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--txt)' }}>
                  <span style={{ color: 'var(--txt3)' }}>ICF資格レベル：</span>
                  <span style={{ fontWeight: 500, marginLeft: 4 }}>{ICF_LEVEL_LABELS[user?.icf_level || 'none']}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── プロフィールタブ ── */}
        {activeTab === 'profile' && (
          <div>
            {/* Score trend chart */}
            {sessionList.length >= 2 && (
              <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>スコア推移</h2>
                <ScoreChart sessionList={sessionList} />
              </div>
            )}

            {/* Session list */}
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
                          <div className="session-date">{formatDate(s.created_at)}</div>
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
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Credit history */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>クレジット履歴</h2>
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
        )}
      </main>

      <footer style={{ borderTop: '0.5px solid var(--border)', background: 'var(--surface)', marginTop: '2rem', padding: '1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/data-policy" style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'underline' }}>データの取り扱い</Link>
          <Link href="/tokusho" style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'underline' }}>特定商取引法に基づく表記</Link>
        </div>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt3)' }}>読み込み中...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
