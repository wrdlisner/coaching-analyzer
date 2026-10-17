'use client'

import { useEffect, useState } from 'react'
import { auth, googleAuth, googleLinkUrl, GOOGLE_LOGIN_ENABLED, UserInfo } from '@/lib/api'

// アカウント設定「ログイン方法」: Google連携の追加・解除と、パスワードの設定(設計書② P3)

// /dashboard?tab=settings&google=... で返ってくる連携の結果(バックエンド auth_google.py と対応)
const LINK_RESULT_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: 'Googleアカウントを連携しました。次回から「Google で続ける」でログインできます。', ok: true },
  already_linked: { text: 'このGoogleアカウントは、別のCoachmarkアカウントに連携されています。', ok: false },
  other_account: { text: 'すでに別のGoogleアカウントを連携しています。切り替える場合は、いまの連携を解除してから連携してください。', ok: false },
  expired: { text: '時間が経ったため連携を完了できませんでした。もう一度お試しください。', ok: false },
  unavailable: { text: '現在Googleアカウントの連携をご利用いただけません。', ok: false },
}

export function readLinkResultFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('google')
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
  background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--txt)' }
const subStyle: React.CSSProperties = { fontSize: 12, color: 'var(--txt2)', marginTop: 2, wordBreak: 'break-all' }
const linkButtonStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
}

export default function LoginMethodsCard({
  user,
  onUserUpdate,
}: {
  user: UserInfo
  onUserUpdate?: (user: UserInfo) => void
}) {
  const hasPassword = user.has_password !== false
  const googleEmail = user.google_email || null
  const googleLinked = (user.login_methods || []).includes('google')

  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [passwordMailSent, setPasswordMailSent] = useState(false)

  // Google から戻ってきたときの結果表示。表示したらURLから消す
  useEffect(() => {
    const result = readLinkResultFromUrl()
    if (!result) return
    setNotice(LINK_RESULT_MESSAGES[result] || LINK_RESULT_MESSAGES.expired)
    const params = new URLSearchParams(window.location.search)
    params.delete('google')
    const qs = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [])

  const handleLink = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const { intent } = await googleAuth.linkIntent()
      window.location.href = googleLinkUrl(intent)
    } catch (err: unknown) {
      setNotice({ text: err instanceof Error ? err.message : '連携を開始できませんでした', ok: false })
      setBusy(false)
    }
  }

  const handleUnlink = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await googleAuth.unlink()
      const updated = await auth.getMe()
      onUserUpdate?.(updated)
      setNotice({ text: 'Googleアカウントの連携を解除しました。', ok: true })
    } catch (err: unknown) {
      setNotice({ text: err instanceof Error ? err.message : '解除できませんでした', ok: false })
    } finally {
      setBusy(false)
      setConfirmUnlink(false)
    }
  }

  const handleSendPasswordMail = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await auth.forgotPassword(user.email)
      setPasswordMailSent(true)
    } catch (err: unknown) {
      setNotice({ text: err instanceof Error ? err.message : 'メールを送信できませんでした', ok: false })
    } finally {
      setBusy(false)
    }
  }

  // Googleボタンを公開していない間は、未連携ユーザーにカードを出さない
  if (!GOOGLE_LOGIN_ENABLED && !googleLinked) return null

  return (
    <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4, marginTop: 0 }}>ログイン方法</h2>
      <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12, marginTop: 0 }}>
        Googleアカウントとメールアドレス・パスワードのどちらでもログインできます
      </p>

      {notice && (
        <div
          role="status"
          style={{
            fontSize: 13, lineHeight: 1.6, borderRadius: 'var(--rs)', padding: '10px 14px', marginBottom: 10,
            background: notice.ok ? 'var(--teal-l)' : 'var(--coral-l)',
            color: notice.ok ? 'var(--teal)' : 'var(--coral)',
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Google */}
        <div style={rowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>Google</div>
            <div style={subStyle}>{googleLinked ? `連携済み${googleEmail ? `（${googleEmail}）` : ''}` : '未連携'}</div>
          </div>
          {googleLinked ? (
            confirmUnlink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>解除しますか？</span>
                <button onClick={handleUnlink} disabled={busy} style={{ ...linkButtonStyle, color: 'var(--coral)' }}>
                  {busy ? '解除中...' : '解除する'}
                </button>
                <button onClick={() => setConfirmUnlink(false)} disabled={busy} style={{ ...linkButtonStyle, color: 'var(--txt2)' }}>
                  やめる
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmUnlink(true)}
                disabled={!hasPassword || busy}
                style={{ ...linkButtonStyle, color: hasPassword ? 'var(--txt2)' : 'var(--txt3)', cursor: hasPassword ? 'pointer' : 'not-allowed' }}
                title={hasPassword ? undefined : 'パスワードを設定すると解除できます'}
              >
                連携を解除
              </button>
            )
          ) : (
            <button onClick={handleLink} disabled={busy} style={linkButtonStyle}>
              {busy ? '移動中...' : 'Googleと連携する'}
            </button>
          )}
        </div>

        {/* パスワード */}
        <div style={rowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>メールアドレス・パスワード</div>
            <div style={subStyle}>
              {hasPassword
                ? `設定済み（${user.email}）`
                : passwordMailSent
                  ? `${user.email} に設定用のメールを送りました（リンクの有効期限は1時間です）`
                  : '未設定'}
            </div>
          </div>
          {!hasPassword && !passwordMailSent && (
            <button onClick={handleSendPasswordMail} disabled={busy} style={linkButtonStyle}>
              パスワードを設定する
            </button>
          )}
        </div>
      </div>

      {googleLinked && !hasPassword && (
        <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0 0' }}>
          ログインする手段がなくならないよう、パスワードを設定するまでGoogleの連携は解除できません。
        </p>
      )}
    </div>
  )
}
