'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, mentors, MentorInfo, UserInfo } from '@/lib/api'

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
  individual: '個人向け',
  corporate: '法人向け',
  both: '個人・法人',
}

function MentorCard({ mentor, onClickContact }: { mentor: MentorInfo; onClickContact: (m: MentorInfo) => void }) {
  return (
    <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {mentor.photo_url ? (
          <img src={mentor.photo_url} alt={mentor.display_name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '0.5px solid var(--border)' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--purple-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, color: 'var(--purple)' }}>
            {mentor.display_name.charAt(0)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>{mentor.display_name}</h3>
            <span className="icf-badge icf-pcc">{mentor.credential}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
            コーチ歴 {mentor.coaching_years}年 ・ {CLIENT_TYPE_LABELS[mentor.client_type] || mentor.client_type}
          </div>
          {mentor.specialties.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {mentor.specialties.map(s => (
                <span key={s} style={{ fontSize: 11, background: 'var(--purple-l)', color: 'var(--purple)', borderRadius: 4, padding: '2px 8px' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, margin: 0 }}>
        {mentor.bio.length > 150 ? mentor.bio.slice(0, 150) + '…' : mentor.bio}
      </p>

      {mentor.style_note && (
        <p style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          {mentor.style_note.length > 100 ? mentor.style_note.slice(0, 100) + '…' : mentor.style_note}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {mentor.sns_url && (
          <a href={mentor.sns_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--purple)', textDecoration: 'none' }}>
            SNS / サイト →
          </a>
        )}
        <button
          onClick={() => onClickContact(mentor)}
          className="btn-create"
          style={{ marginLeft: 'auto' }}
        >
          メンタリングを申し込む
        </button>
      </div>
    </div>
  )
}

export default function MentorsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [mentorList, setMentorList] = useState<MentorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCredential, setFilterCredential] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')

  useEffect(() => {
    auth.getMe().then(setUser).catch(() => router.push('/login'))
    mentors.trackView().catch(() => {})
    fetchMentors()
  }, [router])

  const fetchMentors = async (credential?: string, specialty?: string) => {
    setLoading(true)
    try {
      const list = await mentors.list(credential || undefined, specialty || undefined)
      setMentorList(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = (credential: string, specialty: string) => {
    setFilterCredential(credential)
    setFilterSpecialty(specialty)
    fetchMentors(credential, specialty)
  }

  const handleClickContact = async (mentor: MentorInfo) => {
    try { await mentors.trackClick(mentor.id) } catch { /* ignore */ }
    window.open(mentor.contact_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 14, color: 'var(--txt)' }}>
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">CA</div>
          CoachingAnalyzer
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{user?.name}</span>
          {user?.role === 'mentor' && <Link href="/mentors/profile/edit" className="topbar-link">プロフィール編集</Link>}
          <Link href="/dashboard" className="topbar-link">← ダッシュボード</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>メンターコーチ一覧</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>PCC・MCC取得者によるメンタリングを受けてみませんか</p>
        </div>

        {/* フィルター */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            className="ds-input"
            style={{ maxWidth: 180 }}
            value={filterCredential}
            onChange={e => handleFilter(e.target.value, filterSpecialty)}
          >
            <option value="">クレデンシャル（全て）</option>
            <option value="PCC">PCC</option>
            <option value="MCC">MCC</option>
          </select>
          <select
            className="ds-input"
            style={{ maxWidth: 240 }}
            value={filterSpecialty}
            onChange={e => handleFilter(filterCredential, e.target.value)}
          >
            <option value="">コンピテンシー（全て）</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterCredential || filterSpecialty) && (
            <button className="btn-cancel-sm" onClick={() => handleFilter('', '')}>
              フィルターをリセット
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--txt3)' }}>読み込み中...</div>
        ) : mentorList.length === 0 ? (
          <div className="ds-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--txt3)' }}>条件に合うメンターが見つかりませんでした</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mentorList.map(m => (
              <MentorCard key={m.id} mentor={m} onClickContact={handleClickContact} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
