'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  auth, sessions, credits, coupons, notices, payments, insights, meta, removeToken,
  UserInfo, SessionSummary, CreditRecord, Notice, CouponInfo, ProfileInsightPayload,
} from '@/lib/api'
import { engineBadgeLabel } from '@/lib/format'
import { LOW_CREDIT_THRESHOLD } from '@/components/dashboard/constants'
import PurchaseConfirmModal from '@/components/dashboard/PurchaseConfirmModal'
import CreditGuideModal from '@/components/dashboard/CreditGuideModal'
import ScoreTrendChart from '@/components/dashboard/ScoreTrendChart'
import SessionListSection from '@/components/dashboard/SessionListSection'
import DiffCommentCard from '@/components/dashboard/DiffCommentCard'
import CreditPurchaseCard from '@/components/dashboard/CreditPurchaseCard'
import AccountSettingsAccordion from '@/components/dashboard/AccountSettingsAccordion'
import PersonCard from '@/components/dashboard/PersonCard'
import RadarChartSVG from '@/components/dashboard/RadarChartSVG'
import AiCommentCard from '@/components/dashboard/AiCommentCard'
import GrowthReportsCard from '@/components/dashboard/GrowthReportsCard'
import { PACK_OPTIONS } from '@/components/dashboard/constants'

type DashTab = 'home' | 'profile'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')
  const mentorApplied = searchParams.get('mentor_applied')

  const [activeTab, setActiveTab] = useState<DashTab>(
    searchParams.get('tab') === 'profile' ? 'profile' : 'home'
  )
  const [user, setUser] = useState<UserInfo | null>(null)
  const [sessionList, setSessionList] = useState<SessionSummary[]>([])
  const [creditHistory, setCreditHistory] = useState<CreditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [couponList, setCouponList] = useState<CouponInfo[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [showCreditGuide, setShowCreditGuide] = useState(false)
  const [selectedPack, setSelectedPack] = useState<'1' | '3' | '10' | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const [isDark, setIsDark] = useState(false)
  const [showMentorCongrats, setShowMentorCongrats] = useState(false)
  const [insight, setInsight] = useState<ProfileInsightPayload | null>(null)
  const [engineVersion, setEngineVersion] = useState<string | null>(null)

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

  const switchTab = (tab: DashTab) => {
    setActiveTab(tab)
    // タブをURLに同期（直リンク・リロード対応）。既存パラメータは維持
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'home') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    router.replace(`/dashboard${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, sessionsData, creditsData, couponsData] = await Promise.all([
          auth.getMe(), sessions.list(), credits.getHistory(), coupons.list(),
        ])
        setUser(userData)
        setSessionList(sessionsData)
        setCreditHistory(creditsData)
        setCouponList(couponsData)

        // おめでとう通知：承認済みで未表示なら表示
        if (userData.mentor_status === 'approved' && userData.role === 'mentor') {
          const key = `mentor_congrats_seen_${userData.id}`
          if (!localStorage.getItem(key)) setShowMentorCongrats(true)
        }

      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
    notices.getLatest().then(setNotice).catch(() => {})
    insights.getMe().then(res => setInsight(res.payload)).catch(() => {})
    meta.getEngine().then(res => setEngineVersion(res.engine_version)).catch(() => {})
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

  // グラフ右上に表示する現行エンジン表記（ユーザーの目標資格からモードを決定）
  const currentEngineLabel = engineVersion
    ? engineBadgeLabel(user?.icf_level === 'acc' ? 'acc' : 'standard', engineVersion)
    : null

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
          Coachmark
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{user?.name}</span>
          <button className="credit-badge" onClick={() => setShowCreditGuide(true)}>
            ⬡ {user?.credits} クレジット
          </button>
          {user?.is_admin && <a href="/admin" className="topbar-link">管理者ページ</a>}
          {user?.role === 'mentor' && <a href="/mentors" className="topbar-link">メンター一覧</a>}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {isDark ? '☀️ ライト' : '🌙 ダーク'}
          </button>
          <button className="topbar-link" onClick={handleLogout}>ログアウト</button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${activeTab === 'home' ? ' active' : ''}`} onClick={() => switchTab('home')}>
          ホーム
        </button>
        <button className={`tab${activeTab === 'profile' ? ' active' : ''}`} onClick={() => switchTab('profile')}>
          プロフィール
        </button>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        {/* ── ホームタブ ──「今日使う」: 分析の実行と時系列データ ── */}
        {activeTab === 'home' && (
          <div>
            {/* Notice banner */}
            {notice && !noticeDismissed && (
              <div className="notif">
                <Link href={`/notices/${notice.id}`} className="notif-left" style={{ textDecoration: 'none' }}>
                  <span className="notif-tag">NEW</span>
                  <span className="notif-text">{notice.title}</span>
                  <span className="notif-date">
                    {notice.published_at
                      ? new Date(notice.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                      : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--purple)', flexShrink: 0, fontWeight: 500 }}>詳細を見る →</span>
                </Link>
                <button className="notif-close" onClick={handleDismissNotice} aria-label="閉じる">✕</button>
              </div>
            )}

            {/* おめでとう通知（承認時・初回のみ） */}
            {showMentorCongrats && (
              <div style={{ background: 'var(--teal-l)', border: '1px solid var(--teal)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🎉</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal)', margin: '0 0 4px' }}>おめでとうございます！メンターコーチとして承認されました</p>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '0 0 10px', lineHeight: 1.6 }}>プロフィールがメンター一覧に公開されています。プロフィールの編集やMCQガイドはメンター向けメニューからご確認ください。</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href="/mentors/profile/edit" className="btn-create" style={{ fontSize: 12 }}>プロフィールを確認</a>
                    <button
                      onClick={() => {
                        if (user) localStorage.setItem(`mentor_congrats_seen_${user.id}`, '1')
                        setShowMentorCongrats(false)
                      }}
                      className="btn-cancel-sm"
                      style={{ fontSize: 12 }}
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mentor application result */}
            {mentorApplied === '1' && (
              <div style={{ background: 'var(--teal-l)', border: '0.5px solid var(--teal)', borderRadius: 'var(--rs)', padding: '12px 16px', fontSize: 13, color: 'var(--teal)', fontWeight: 500, marginBottom: '1.25rem' }}>
                メンター申請を受け付けました。審査結果をお待ちください。
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

            {/* Mentor section */}
            {user?.role === 'mentor' ? (
              <div className="ds-card" style={{ marginBottom: '0.75rem', borderLeft: '3px solid var(--purple)' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 8, marginTop: 0 }}>── メンター向け ──</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href="/mentors/profile/edit" className="btn-cancel-sm">プロフィール編集</a>
                  <a href="/mentors/mcq-guide" className="btn-cancel-sm">MCQガイド</a>
                  <a href="/mentors" className="btn-cancel-sm">一覧プレビュー</a>
                </div>
              </div>
            ) : user?.mentor_status === 'pending' ? (
              <div className="ds-card" style={{ marginBottom: '0.75rem', background: 'var(--amber-l)', border: '0.5px solid var(--amber)' }}>
                <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600, margin: 0 }}>⏳ メンター審査中です</p>
                <p style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 4, marginBottom: 0 }}>申請内容を確認中です。しばらくお待ちください。</p>
              </div>
            ) : user?.mentor_status === 'rejected' ? (
              <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: 13, color: 'var(--coral)', fontWeight: 600, margin: 0 }}>今回はご登録いただけませんでした</p>
                <div style={{ marginTop: 8 }}>
                  <a href="/mentors/apply" className="btn-cancel-sm">再度申請する</a>
                </div>
              </div>
            ) : user?.mentor_status === 'none' ? (
              <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', margin: 0 }}>メンターコーチとして登録する</p>
                    <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2, marginBottom: 0 }}>PCC・MCC保有者向け。コーチングツールを使いながらメンタリング活動ができます。</p>
                  </div>
                  <a href="/mentors/apply" className="btn-cancel-sm" style={{ flexShrink: 0 }}>登録申請 →</a>
                </div>
              </div>
            ) : null}

            {/* Hero banner */}
            <div className="hero">
              <div>
                <h2>新しい分析を始める</h2>
                <p>通常分析 1クレジット・ディープ分析 2クレジット ／ 現在 {user?.credits} クレジット保有</p>
                <button className="hero-link" onClick={() => setShowCreditGuide(true)}>
                  クレジットを増やすには？→
                </button>
              </div>
              <Link href="/analyze" className="hero-btn">分析を開始</Link>
            </div>

            {/* 前回からの差分コメント（最新分析分） */}
            <DiffCommentCard sessionList={sessionList} />

            {/* Score trend chart */}
            {sessionList.length >= 2 && (
              <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>スコア推移</h2>
                  {currentEngineLabel && (
                    <span className="engine-badge" title="現在の評価モード・分析エンジンバージョン">{currentEngineLabel}</span>
                  )}
                </div>
                <ScoreTrendChart sessionList={sessionList} />
              </div>
            )}

            {/* Session list */}
            <SessionListSection sessionList={sessionList} />

            {/* クレジット購入（残高が少ないときのみホームに表示。通常はプロフィール側アカウント設定） */}
            {user && user.credits <= LOW_CREDIT_THRESHOLD ? (
              <CreditPurchaseCard
                onSelect={handleOpenPurchaseModal}
                note={`残りクレジットが少なくなっています（現在 ${user.credits} クレジット）`}
              />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '0 0 0.75rem' }}>
                クレジットの購入・友達紹介は
                <button onClick={() => switchTab('profile')} style={{ fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '0 2px', textDecoration: 'underline' }}>
                  プロフィールのアカウント設定
                </button>
                から
              </p>
            )}
          </div>
        )}

        {/* ── プロフィールタブ ──「自分を知る」: 集約された自己像と設定 ── */}
        {activeTab === 'profile' && user && (
          <div>
            {/* 本人カード */}
            <PersonCard
              user={user}
              insight={insight}
              sessionCount={sessionList.length}
              onUserUpdate={setUser}
            />

            {/* レーダーチャート + AIコメント（2カラム） */}
            <div className="two-col" style={{ marginBottom: '0.75rem' }}>
              <div className="ds-card" style={{ marginBottom: 0 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 8px' }}>コンピテンシーバランス</h2>
                <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '0 0 8px' }}>直近5回の分析の平均（5.0満点）</p>
                <RadarChartSVG sessionList={sessionList} />
              </div>
              <div className="ds-card" style={{ marginBottom: 0 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>🤖 AIから見たあなた</h2>
                <AiCommentCard insight={insight} />
              </div>
            </div>

            {/* 半期成長レポート / 成長記録PDF（2カラム） */}
            <GrowthReportsCard sessionCount={sessionList.length} />

            {/* アカウント設定（折りたたみ） */}
            <AccountSettingsAccordion
              user={user}
              couponList={couponList}
              creditHistory={creditHistory}
              onSelectPack={handleOpenPurchaseModal}
            />
          </div>
        )}
      </main>

      <footer style={{ borderTop: '0.5px solid var(--border)', background: 'var(--surface)', marginTop: '2rem', padding: '1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/data-policy" style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'underline' }}>データの取り扱い</Link>
          <Link href="/tokusho" style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'underline' }}>特定商取引法に基づく表記</Link>
          <Link href="/updates" style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'underline' }}>アップデート情報</Link>
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
