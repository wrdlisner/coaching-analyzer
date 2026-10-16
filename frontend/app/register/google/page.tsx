'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { googleAuth, setToken, takeTicketFromHash } from '@/lib/api'
import AuthShell, { ErrorBox, LoadingScreen } from '@/components/auth/AuthShell'
import ConsentChecklist, { initialConsents } from '@/components/auth/ConsentChecklist'

// Google で初めてログインした人の追加入力画面(ICF資格レベルと同意事項)
export default function GoogleRegisterPage() {
  const router = useRouter()
  const started = useRef(false)
  const [ticket, setTicket] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icfLevel, setIcfLevel] = useState('none')
  const [consents, setConsents] = useState(initialConsents())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const t = takeTicketFromHash()
    if (!t) {
      router.replace('/login?error=google_ticket_expired')
      return
    }
    googleAuth
      .ticketInfo(t, 'signup')
      .then((info) => {
        setTicket(t)
        setEmail(info.email)
        setName(info.name || '')
        setReferralCode(info.referral_code)
      })
      .catch(() => router.replace('/login?error=google_ticket_expired'))
  }, [router])

  const allConsentsChecked = consents.every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!allConsentsChecked) {
      setError('すべての同意事項にチェックしてください')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await googleAuth.completeSignup({
        ticket,
        name,
        icf_level: icfLevel,
        agreed: true,
        referral_code: referralCode,
      })
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!ticket) return <LoadingScreen />

  return (
    <AuthShell title="アカウント登録" subtitle="あと少しで登録が完了します（+1クレジット）" backHref="/login" backLabel="← ログインに戻る">
      {referralCode && (
        <div className="bg-[var(--purple-l)] border border-[var(--purple-l)] rounded-lg px-4 py-3 mb-4 text-sm text-[var(--purple)]">
          友達の紹介リンクから登録しています
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Googleアカウント</label>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2 break-all">{email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
            <input
              type="text"
              required
              maxLength={255}
              className="input-field"
              placeholder="山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Googleの表示名を入れています。変更できます。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ICF資格レベル</label>
            <select className="input-field" value={icfLevel} onChange={(e) => setIcfLevel(e.target.value)}>
              <option value="none">未取得</option>
              <option value="acc">ACC</option>
              <option value="pcc">PCC</option>
              <option value="mcc">MCC</option>
            </select>
          </div>

          <ConsentChecklist consents={consents} onChange={setConsents} />

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading || !allConsentsChecked} className="btn-primary w-full py-3">
            {loading ? '登録中...' : '登録する（+1クレジット）'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          メールアドレスで登録する場合は{' '}
          <Link href="/register" className="text-[var(--purple)] hover:underline">
            こちら
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
