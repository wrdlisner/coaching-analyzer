'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, mentors, UserInfo } from '@/lib/api'

const SPECIALTIES = [
  '基盤を示す',
  'コーチングマインドを体現する',
  '合意を確立し維持する',
  '信頼と安全を育む',
  'プレゼンスを維持する',
  '積極的に傾聴する',
  '気づきを呼び起こす',
  'クライアントの成長を促進する',
]

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: '個人',
  corporate: '法人',
  both: '両方',
}

export default function MentorApplyPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    display_name: '',
    credential: 'PCC',
    coaching_years: '',
    bio: '',
    photo_url: '',
    specialties: [] as string[],
    client_type: 'individual',
    style_note: '',
    session_duration_minutes: '',
    session_price_jpy: '',
    contact_url: '',
    sns_url: '',
  })

  useEffect(() => {
    auth.getMe().then(setUser).catch(() => router.push('/login')).finally(() => setLoading(false))
  }, [router])

  const handleSpecialtyChange = (s: string) => {
    setForm(prev => {
      const exists = prev.specialties.includes(s)
      if (exists) return { ...prev, specialties: prev.specialties.filter(x => x !== s) }
      if (prev.specialties.length >= 3) return prev
      return { ...prev, specialties: [...prev.specialties, s] }
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoUploading(true)
    try {
      const { url } = await mentors.uploadPhoto(file)
      setForm(prev => ({ ...prev, photo_url: url }))
    } catch {
      setError('写真のアップロードに失敗しました')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.specialties.length === 0) {
      setError('得意なICFコンピテンシーを1つ以上選択してください')
      return
    }
    const bioLen = form.bio.length
    if (bioLen < 200 || bioLen > 400) {
      setError(`自己紹介文は200〜400字で入力してください（現在${bioLen}字）`)
      return
    }

    setSubmitting(true)
    try {
      await mentors.apply({
        display_name: form.display_name,
        credential: form.credential,
        coaching_years: parseInt(form.coaching_years, 10),
        bio: form.bio,
        photo_url: form.photo_url || null,
        specialties: form.specialties,
        client_type: form.client_type,
        style_note: form.style_note || null,
        session_duration_minutes: form.session_duration_minutes ? parseInt(form.session_duration_minutes, 10) : null,
        session_price_jpy: form.session_price_jpy ? parseInt(form.session_price_jpy, 10) : null,
        contact_url: form.contact_url,
        sns_url: form.sns_url || null,
      })
      router.push('/dashboard?mentor_applied=1')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '申請に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt3)', fontSize: 14 }}>読み込み中...</span>
      </div>
    )
  }

  if (!user) return null

  if (user.mentor_status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="ds-card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>審査中です</h2>
          <p style={{ fontSize: 14, color: 'var(--txt2)', marginBottom: 20 }}>申請内容を確認中です。結果はメールでお知らせします。</p>
          <Link href="/dashboard" className="btn-create">ダッシュボードに戻る</Link>
        </div>
      </div>
    )
  }

  if (user.mentor_status === 'approved') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="ds-card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>メンターとして登録済みです</h2>
          <p style={{ fontSize: 14, color: 'var(--txt2)', marginBottom: 20 }}>プロフィールの編集はこちらから行えます。</p>
          <Link href="/mentors/profile/edit" className="btn-create">プロフィールを編集</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 14, color: 'var(--txt)' }}>
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">CA</div>
          CoachingAnalyzer
        </div>
        <div className="topbar-right">
          <Link href="/dashboard" className="topbar-link">← ダッシュボード</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>メンターコーチとして登録する</h1>

        <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>
          メンター登録はPCC以上のクレデンシャル保有者を対象としています。<br />
          審査の結果、登録をお断りする場合がございます。あらかじめご了承ください。
        </div>

        {user.mentor_status === 'rejected' && (
          <div style={{ background: 'var(--amber-l)', border: '0.5px solid var(--amber)', borderRadius: 'var(--rs)', padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>
            以前の申請は承認されませんでした。改めて申請いただけます。
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 表示名 */}
          <div>
            <label className="ds-label">表示名 <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="text"
              className="ds-input"
              required
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
              placeholder="例：山田 花子"
            />
          </div>

          {/* クレデンシャル */}
          <div>
            <label className="ds-label">保有クレデンシャル <span style={{ color: 'var(--coral)' }}>*</span></label>
            <select className="ds-input" value={form.credential} onChange={e => setForm({ ...form, credential: e.target.value })}>
              <option value="PCC">PCC</option>
              <option value="MCC">MCC</option>
            </select>
          </div>

          {/* コーチ歴 */}
          <div>
            <label className="ds-label">コーチ歴（年数） <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="number"
              className="ds-input"
              required
              min={1}
              value={form.coaching_years}
              onChange={e => setForm({ ...form, coaching_years: e.target.value })}
              placeholder="例：5"
              style={{ maxWidth: 120 }}
            />
          </div>

          {/* 自己紹介文 */}
          <div>
            <label className="ds-label">
              自己紹介文 <span style={{ color: 'var(--coral)' }}>*</span>
              <span style={{ fontWeight: 400, marginLeft: 8, color: form.bio.length < 200 || form.bio.length > 400 ? 'var(--coral)' : 'var(--teal)' }}>
                {form.bio.length} / 200〜400字
              </span>
            </label>
            <textarea
              className="ds-input"
              required
              rows={6}
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="コーチとしての経歴・強み・スタイルなどをご記入ください"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* プロフィール写真 */}
          <div>
            <label className="ds-label">プロフィール写真（任意・5MBまで）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {form.photo_url && (
                <img src={form.photo_url} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '0.5px solid var(--border)' }} />
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-cancel-sm"
                disabled={photoUploading}
              >
                {photoUploading ? 'アップロード中...' : '写真を選択'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
          </div>

          {/* 得意なICFコンピテンシー */}
          <div>
            <label className="ds-label">
              得意なICFコンピテンシー <span style={{ color: 'var(--coral)' }}>*</span>
              <span style={{ fontWeight: 400, marginLeft: 8, color: 'var(--txt3)' }}>3つまで選択できます</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {SPECIALTIES.map(s => {
                const checked = form.specialties.includes(s)
                const disabled = !checked && form.specialties.length >= 3
                return (
                  <label
                    key={s}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontSize: 13 }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleSpecialtyChange(s)}
                    />
                    {s}
                  </label>
                )
              })}
            </div>
          </div>

          {/* 主なクライアント層 */}
          <div>
            <label className="ds-label">主なクライアント層 <span style={{ color: 'var(--coral)' }}>*</span></label>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {Object.entries(CLIENT_TYPE_LABELS).map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="client_type"
                    value={val}
                    checked={form.client_type === val}
                    onChange={() => setForm({ ...form, client_type: val })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* メンタリングスタイル */}
          <div>
            <label className="ds-label">メンタリングスタイル（任意）</label>
            <textarea
              className="ds-input"
              rows={3}
              value={form.style_note}
              onChange={e => setForm({ ...form, style_note: e.target.value })}
              placeholder="あなたのメンタリングの特徴やスタイルを自由にご記入ください"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* セッション情報 */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="ds-label">セッション時間（分）（任意）</label>
              <input
                type="number"
                className="ds-input"
                min={1}
                value={form.session_duration_minutes}
                onChange={e => setForm({ ...form, session_duration_minutes: e.target.value })}
                placeholder="例：60"
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="ds-label">料金（円）（任意）</label>
              <input
                type="number"
                className="ds-input"
                min={0}
                value={form.session_price_jpy}
                onChange={e => setForm({ ...form, session_price_jpy: e.target.value })}
                placeholder="例：10000"
              />
            </div>
          </div>

          {/* 申込みURL */}
          <div>
            <label className="ds-label">申込みURL（Calendlyなど） <span style={{ color: 'var(--coral)' }}>*</span></label>
            <input
              type="url"
              className="ds-input"
              required
              value={form.contact_url}
              onChange={e => setForm({ ...form, contact_url: e.target.value })}
              placeholder="https://calendly.com/..."
            />
          </div>

          {/* SNS/Webサイト */}
          <div>
            <label className="ds-label">SNS / Webサイト（任意）</label>
            <input
              type="url"
              className="ds-input"
              value={form.sns_url}
              onChange={e => setForm({ ...form, sns_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--coral)', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button type="submit" disabled={submitting} className="btn-create" style={{ flex: 1, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? '申請中...' : '申請する'}
            </button>
            <Link href="/dashboard" className="btn-cancel-sm" style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              キャンセル
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
