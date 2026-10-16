'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { googleAuth, setToken, takeTicketFromHash } from '@/lib/api'
import AuthShell, { ErrorBox, LoadingScreen } from '@/components/auth/AuthShell'

// 既存アカウント(メール未確認)と Google をつなぐ前に、パスワードで本人確認する画面
export default function LinkGooglePage() {
  const router = useRouter()
  const started = useRef(false)
  const [ticket, setTicket] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      .ticketInfo(t, 'link_confirm')
      .then((info) => {
        setTicket(t)
        setEmail(info.email)
      })
      .catch(() => router.replace('/login?error=google_ticket_expired'))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    setError('')
    setLoading(true)
    try {
      const res = await googleAuth.confirmLink(ticket, password)
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '連携に失敗しました'
      if (message.includes('無効')) {
        router.replace('/login?error=google_ticket_expired')
        return
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!ticket) return <LoadingScreen />

  return (
    <AuthShell title="Googleアカウントの連携" backHref="/login" backLabel="← ログインに戻る">
      <div className="card">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          <strong className="break-all">{email}</strong> のアカウントがすでにあります。
          <br />
          パスワードを入力すると、次回からGoogleでログインできるようになります。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="input-field pr-20"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '隠す' : '表示する'}
              </button>
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? '確認中...' : '連携してログイン'}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-gray-500">
          <p>
            <Link href="/forgot-password" className="text-[var(--purple)] hover:underline">
              パスワードをお忘れですか？
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            パスワードを再設定すると、次回からはこの確認なしでGoogleでログインできます。
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
