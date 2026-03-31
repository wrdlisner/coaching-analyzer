'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, sessions, credits, coupons, notices, payments, removeToken, UserInfo, SessionSummary, CreditRecord, Notice, CouponInfo } from '@/lib/api'

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

const REASON_LABELS: Record<string, string> = {
  analysis: '分析実行',
  feedback: 'フィードバック',
  bonus: '新規登録ボーナス',
  referral: '友達紹介ボーナス',
  purchase: 'クレジット購入',
}

const ICF_LEVEL_LABELS: Record<string, string> = {
  none: '未取得',
  acc: 'ACC',
  pcc: 'PCC',
  mcc: 'MCC',
}

const PACK_OPTIONS: { pack: '1' | '3' | '10'; label: string; price: string; credits: number }[] = [
  { pack: '1', label: '1回', price: '¥500', credits: 1 },
  { pack: '3', label: '3回パック', price: '¥1,200', credits: 3 },
  { pack: '10', label: '10回パック', price: '¥3,500', credits: 10 },
]

function CreditGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">クレジットの増やし方</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">新規登録ボーナス</p>
              <p className="text-sm text-gray-500">登録時に +1クレジット 付与されます。</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl">🎟️</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">フィードバック投稿でクーポン獲得</p>
              <p className="text-sm text-gray-500">セッション分析後にフィードバックを送ると、クレジット購入時に使える割引クーポンがもらえます。</p>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>・通常：¥100クーポン</p>
                <p>・累計3回目：¥200クーポン</p>
                <p>・累計5回目：¥300クーポン</p>
                <p className="text-gray-400">（未使用5枚まで保有可能・有効期限30日）</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">友達紹介ボーナス</p>
              <p className="text-sm text-gray-500">紹介した友達が初回分析を完了すると +1クレジット 付与されます。紹介URLはこのページの「友達を紹介する」からコピーできます。</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl">💳</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">クレジット購入</p>
              <p className="text-sm text-gray-500">1回分（¥500）、3回分（¥1,200）、10回分（¥3,500）のパックから選べます。クーポンコードをお持ちの場合は購入時に入力してください。</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">閉じる</button>
        </div>
      </div>
    </div>
  )
}

function ReferralSection({ referralCode }: { referralCode: string }) {
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
    <div className="card">
      <h2 className="text-base font-bold text-gray-900 mb-1">友達を紹介する</h2>
      <p className="text-sm text-gray-500 mb-4">
        紹介した友達が初回分析を完了すると、あなたに <span className="font-semibold text-blue-600">+1クレジット</span> が付与されます
      </p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <span className="flex-1 text-sm text-gray-700 truncate">{referralUrl}</span>
        <button
          onClick={handleCopy}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
        >
          {copied ? 'コピー済み' : 'URLをコピー'}
        </button>
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')
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
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, sessionsData, creditsData, couponsData] = await Promise.all([
          auth.getMe(),
          sessions.list(),
          credits.getHistory(),
          coupons.list(),
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

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  const handlePurchase = async (pack: '1' | '3' | '10') => {
    setPurchaseLoading(pack)
    setPurchaseError('')
    try {
      const { url } = await payments.createCheckout(pack, couponCode.trim() || undefined)
      window.location.href = url
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : '決済の開始に失敗しました')
      setPurchaseLoading(null)
    }
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError('')
    try {
      const updated = await auth.updateProfile({ icf_level: profileForm.icf_level })
      setUser(updated)
      setEditingProfile(false)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setProfileSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreditGuide && <CreditGuideModal onClose={() => setShowCreditGuide(false)} />}
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="font-medium">{user?.name}</span>
              <button
                onClick={() => setShowCreditGuide(true)}
                className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold hover:bg-blue-200 transition-colors"
              >
                {user?.credits} クレジット
              </button>
            </div>
            {user?.is_admin && (
              <a href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                管理者ページ
              </a>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Notice banner */}
        {notice && !noticeDismissed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded">
                    NEW
                  </span>
                  <span className="text-xs text-gray-500">
                    {notice.published_at
                      ? new Date(notice.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                      : ''}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{notice.title}</p>
                <Link
                  href={`/notices/${notice.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  詳細を見る →
                </Link>
              </div>
              <button
                onClick={handleDismissNotice}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* New analysis CTA */}
        <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">新しい分析を始める</h2>
              <p className="text-blue-100 text-sm">
                1クレジット消費 / 現在 {user?.credits} クレジット保有
              </p>
              <button
                onClick={() => setShowCreditGuide(true)}
                className="text-blue-200 hover:text-white text-xs mt-1 underline underline-offset-2 transition-colors"
              >
                クレジットを増やすには？→
              </button>
            </div>
            <Link
              href="/analyze"
              className="bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              分析を開始
            </Link>
          </div>
        </div>

        {/* Payment result messages */}
        {paymentStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4 text-green-800 font-medium">
            購入完了！クレジットが追加されました。
          </div>
        )}
        {paymentStatus === 'cancel' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4 text-yellow-800 font-medium">
            購入をキャンセルしました。
          </div>
        )}

        {/* Coupon list */}
        {couponList.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4">保有クーポン</h2>
            <div className="space-y-2">
              {couponList.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3"
                >
                  <div>
                    <span className="font-mono font-semibold tracking-widest text-gray-800 mr-3">
                      {c.code}
                    </span>
                    <span className="text-sm font-bold text-blue-600">¥{c.discount_amount} OFF</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(c.expires_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}まで
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit purchase */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">クレジットを購入</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACK_OPTIONS.map((option) => (
              <button
                key={option.pack}
                onClick={() => handlePurchase(option.pack)}
                disabled={purchaseLoading !== null}
                className="border border-blue-200 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="text-sm font-semibold text-gray-700 mb-1">{option.label}</div>
                <div className="text-xl font-bold text-blue-600 mb-1">{option.price}</div>
                <div className="text-xs text-gray-500">{option.credits}クレジット</div>
                {purchaseLoading === option.pack && (
                  <div className="text-xs text-blue-500 mt-1">処理中...</div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              クーポンコード（任意）
            </label>
            <input
              type="text"
              className="input-field font-mono uppercase"
              placeholder="例：FB-A1B2C3"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
          </div>
          {purchaseError && (
            <p className="text-sm text-red-600 mt-3">{purchaseError}</p>
          )}
        </div>

        {/* Referral */}
        {user?.referral_code && (
          <ReferralSection referralCode={user.referral_code} />
        )}

        {/* Profile settings */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">プロフィール設定</h2>
            {!editingProfile && (
              <button
                onClick={() => {
                  setProfileForm({ icf_level: user?.icf_level || 'none' })
                  setProfileError('')
                  setEditingProfile(true)
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                編集
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ICF資格レベル
                </label>
                <select
                  className="input-field"
                  value={profileForm.icf_level}
                  onChange={(e) => setProfileForm({ ...profileForm, icf_level: e.target.value })}
                >
                  <option value="none">未取得</option>
                  <option value="acc">ACC</option>
                  <option value="pcc">PCC</option>
                  <option value="mcc">MCC</option>
                </select>
              </div>
              {profileError && (
                <p className="text-sm text-red-600">{profileError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="btn-primary flex-1 py-2 text-sm"
                >
                  {profileSaving ? '保存中...' : '保存する'}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">ICF資格レベル：</span>
              <span className="font-medium ml-1">{ICF_LEVEL_LABELS[user?.icf_level || 'none']}</span>
            </div>
          )}
        </div>

        {/* Sessions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">過去のセッション</h2>
          {sessionList.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">まだ分析したセッションはありません</p>
              <Link href="/analyze" className="btn-primary mt-4 inline-block">
                最初の分析を始める
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionList.map((s) => (
                <Link
                  key={s.id}
                  href={`/report/${s.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(s.created_at)}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDuration(s.duration_seconds)} / コーチ発話 {s.coach_ratio}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {s.avg_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">平均スコア / 5.0</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Credit history */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">クレジット履歴</h2>
          {creditHistory.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">クレジット履歴はありません</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">日時</th>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">理由</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">変動</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {creditHistory.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {REASON_LABELS[c.reason] || c.reason}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-semibold ${
                          c.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {c.amount > 0 ? `+${c.amount}` : c.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/data-policy" className="underline hover:text-gray-600">データの取り扱い</Link>
          <Link href="/tokusho" className="underline hover:text-gray-600">特定商取引法に基づく表記</Link>
        </div>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">読み込み中...</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}
