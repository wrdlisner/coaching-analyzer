'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, UserInfo } from '@/lib/api'

export default function McqGuidePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.getMe()
      .then(u => {
        if (u.role !== 'mentor' || u.mentor_status !== 'approved') {
          router.replace('/dashboard')
          return
        }
        setUser(u)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt3)', fontSize: 14 }}>読み込み中...</span>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 14, color: 'var(--txt)' }}>
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">CA</div>
          CoachingAnalyzer
        </div>
        <div className="topbar-right">
          <Link href="/mentors/profile/edit" className="topbar-link">プロフィール編集</Link>
          <Link href="/dashboard" className="topbar-link">← ダッシュボード</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>MCQガイド</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>ICF Mentor Coach Qualification（MCQ）の取得に向けた情報をまとめています</p>
        </div>

        {/* Section 1 */}
        <div className="ds-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>1. MCQとは何か</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--txt)' }}>ICF Mentor Coach Qualification（MCQ）</strong>は、ICF（国際コーチング連盟）が認定するメンターコーチのための資格です。コーチとしての高度な実践力を持つ者が、次世代のコーチを育成・支援するメンターとして正式に認定されます。
            </p>
            <p style={{ margin: 0 }}>
              MCQはMCC取得プロセスにおいて特に重要な位置づけを持ちます。MCCの申請要件では、ICF認定メンターコーチによるメンタリングが必須となっており、MCQ保有者はそのメンタリングを提供できる立場になります。
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="ds-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>2. 取得要件</h2>
          <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 12px' }}>MCQを取得するには以下の要件を満たす必要があります：</p>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>PCC以上のICFクレデンシャル保有</li>
              <li>500時間以上のコーチング経験</li>
              <li>メンターコーチとしての経験（詳細は以下）</li>
            </ul>

            <div style={{ background: 'var(--purple-l)', border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', padding: '14px 16px', marginTop: 16 }}>
              <p style={{ fontWeight: 600, color: 'var(--purple)', margin: '0 0 8px', fontSize: 13 }}>Credit for Prior Learning（CPL）パスについて</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>
                クレデンシャリング支援の実績がある方には、CPL（事前学習クレジット）パスが特に有効です。過去のメンタリング・コーチング指導の実績を申請に活用でき、要件の一部を既存の経験で充足できる可能性があります。
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="ds-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 16, marginTop: 0 }}>3. 申請プロセス ステップ別</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                step: 'Step 1',
                title: 'ICFポータルでの申請',
                desc: 'ICF公式ポータルサイト（credentials.icf.org）にログインし、MCQ申請フォームを開始します。申請には有効なICFアカウントと現行クレデンシャルが必要です。',
              },
              {
                step: 'Step 2',
                title: '提出書類の準備',
                desc: 'メンタリングセッションのログ、クライアントの評価書、コーチング契約書など、必要書類を揃えます。書類は英語での提出が基本となります。',
              },
              {
                step: 'Step 3',
                title: 'アセスメント',
                desc: '審査委員会によるアセスメントが行われます。書類審査および実際のメンタリングセッションの録音・録画レビューが含まれる場合があります。',
              },
              {
                step: 'Step 4',
                title: '認定後の維持要件',
                desc: 'MCQ認定後は3年ごとの更新が必要です。継続的なメンタリング実績と継続教育（CCE）クレジットの取得が求められます。',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 14 }}>
                <div style={{ flexShrink: 0, width: 64, height: 28, background: 'var(--purple)', color: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                  {step}
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--txt)', margin: '0 0 4px', fontSize: 13 }}>{title}</p>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 */}
        <div className="ds-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 16, marginTop: 0 }}>4. よくある質問</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                q: 'CPLパスの判定基準は？',
                a: 'クレデンシャリング支援（ACC/PCC/MCC取得支援）の実績が3件以上あることが目安です。ただし最終的な判断はICF審査委員会が行います。実績の内容・期間・クライアントとの関係が評価されます。',
              },
              {
                q: '費用感は？',
                a: '申請料は$450〜$550程度（ICF会員か否かによって異なる）が目安です。審査結果によっては追加書類の提出が求められる場合があり、その際は日程・費用が変わる場合があります。（最新情報はICF公式サイトをご確認ください）',
              },
              {
                q: '日本語での対応は？',
                a: '申請書類は基本的に英語での提出が必要ですが、ICF Japanチャプターでは日本語による相談対応を行っています。申請準備や書類翻訳についてのサポートを求めることができます。',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p style={{ fontWeight: 600, color: 'var(--txt)', margin: '0 0 6px', fontSize: 13 }}>Q. {q}</p>
                <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, lineHeight: 1.7, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 */}
        <div className="ds-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 12, marginTop: 0 }}>5. 参考リンク</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://coachingfederation.org/credentials-and-standards/mentor-coach-qualification"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ICF公式MCQページ（英語） →
            </a>
            <a
              href="https://icfjapan.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ICF Japan 問い合わせ窓口 →
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
