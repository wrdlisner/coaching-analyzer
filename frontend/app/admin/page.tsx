'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { admin, auth, adminNotices, UserInfo, AdminFeedback, AdminTrendDataPoint, Notice } from '@/lib/api'

type Tab = 'users' | 'feedbacks' | 'trends' | 'notices'

function icfBadgeClass(level: string): string {
  if (level === 'pcc' || level === 'mcc') return 'icf-badge icf-pcc'
  if (level === 'acc') return 'icf-badge icf-acc'
  return 'icf-badge icf-none'
}

function scorePillClass(score: number): string {
  return score >= 5 ? 'score-pill score-hi' : 'score-pill score-lo'
}

// ---- SVG Trend Chart ----
function TrendChart({ data }: { data: AdminTrendDataPoint[] }) {
  if (data.length === 0) return null

  const W = 760
  const scoreTop = 16
  const scoreH = 180
  const scoreBot = scoreTop + scoreH
  const countTop = scoreBot + 12
  const countH = 40
  const countBot = countTop + countH
  const labelsY = countBot + 18
  const H = labelsY + 14
  const pL = 48
  const pR = 16
  const innerW = W - pL - pR

  const n = data.length
  const xAt = (i: number) => pL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yScore = (v: number) => scoreBot - (v / 5) * scoreH

  const maxCount = Math.max(...data.map((d) => d.analysis_count), 1)
  const barW = Math.max(4, innerW / n - 3)

  const makeLine = (values: (number | null)[]): string => {
    let d = ''
    let pen = false
    values.forEach((v, i) => {
      if (v != null) {
        const x = xAt(i).toFixed(1)
        const y = yScore(v).toFixed(1)
        d += pen ? ` L ${x} ${y}` : `M ${x} ${y}`
        pen = true
      } else {
        pen = false
      }
    })
    return d
  }

  const scoreTicks = [0, 1, 2, 3, 4, 5]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="トレンドグラフ">
      {scoreTicks.map((t) => (
        <g key={t}>
          <line x1={pL} x2={W - pR} y1={yScore(t)} y2={yScore(t)} stroke="#f0efe9" strokeWidth="1" />
          <text x={pL - 6} y={yScore(t) + 4} textAnchor="end" fontSize="10" fill="#9c9b94">{t}</text>
        </g>
      ))}
      {data.map((pt, i) => {
        if (pt.analysis_count === 0) return null
        const bH = (pt.analysis_count / maxCount) * countH
        return (
          <rect key={i} x={xAt(i) - barW / 2} y={countBot - bH} width={barW} height={bH} fill="#EEEDFE" rx="1" />
        )
      })}
      <path d={makeLine(data.map((d) => d.avg_score))} fill="none" stroke="#3266ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makeLine(data.map((d) => d.avg_satisfaction))} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makeLine(data.map((d) => d.avg_accuracy))} fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((pt, i) => (
        <g key={i}>
          {pt.avg_score != null && <circle cx={xAt(i)} cy={yScore(pt.avg_score)} r="3" fill="#3266ad" />}
          {pt.avg_satisfaction != null && <circle cx={xAt(i)} cy={yScore(pt.avg_satisfaction)} r="3" fill="#1D9E75" />}
          {pt.avg_accuracy != null && <circle cx={xAt(i)} cy={yScore(pt.avg_accuracy)} r="3" fill="#BA7517" />}
        </g>
      ))}
      {data.map((pt, i) => {
        if (n > 10 && i % 5 !== 0 && i !== n - 1) return null
        return (
          <text key={i} x={xAt(i)} y={labelsY} textAnchor="middle" fontSize="9" fill="#9c9b94">
            {pt.date.slice(5)}
          </text>
        )
      })}
      <line x1={pL} x2={pL} y1={scoreTop} y2={countBot} stroke="#e8e6df" strokeWidth="1" />
      <line x1={pL} x2={W - pR} y1={scoreBot} y2={scoreBot} stroke="#e8e6df" strokeWidth="1" />
      <line x1={pL} x2={W - pR} y1={countBot} y2={countBot} stroke="#e8e6df" strokeWidth="1" />
      <text x={pL - 6} y={countTop + 10} textAnchor="end" fontSize="9" fill="#EEEDFE">{maxCount}</text>
      <text x={pL - 6} y={countBot + 4} textAnchor="end" fontSize="9" fill="#EEEDFE">0</text>
    </svg>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<UserInfo | null>(null)
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([])
  const [trends, setTrends] = useState<AdminTrendDataPoint[]>([])
  const [trendsUpdatedAt, setTrendsUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({})
  const [actionMsg, setActionMsg] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [noticeList, setNoticeList] = useState<Notice[]>([])
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', published_at: '', is_published: false })
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)

  useEffect(() => {
    auth.getMe()
      .then((user) => {
        if (!user.is_admin) { router.replace('/dashboard'); return }
        setMe(user)
        return Promise.all([admin.listUsers(), admin.listFeedbacks()])
      })
      .then((results) => {
        if (results) { setUsers(results[0]); setFeedbacks(results[1]) }
        return adminNotices.list()
      })
      .then((nl) => { if (nl) setNoticeList(nl) })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    const fetchTrends = () => {
      admin.listTrends().then((data) => { setTrends(data); setTrendsUpdatedAt(new Date()) }).catch(() => {})
    }
    fetchTrends()
    const timer = setInterval(fetchTrends, 24 * 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

  const handleAddCredits = async (userId: string) => {
    const raw = creditInputs[userId] || ''
    if (!/^-?\d+$/.test(raw.trim())) { flash('整数を入力してください'); return }
    const amount = parseInt(raw, 10)
    if (!amount) return
    try {
      const res = await admin.updateCredits(userId, amount)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, credits: res.new_credits } : u))
      setCreditInputs((prev) => ({ ...prev, [userId]: '' }))
      flash('クレジットを更新しました')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const handleToggleAdmin = async (userId: string) => {
    if (userId === me?.id) { flash('自分自身の権限は変更できません'); return }
    try {
      const res = await admin.toggleAdmin(userId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: res.is_admin } : u))
      flash(`管理者権限を${res.is_admin ? '付与' : '剥奪'}しました`)
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const toUTCISO = (localDT: string) => localDT ? new Date(localDT).toISOString() : null
  const toLocalDT = (utcStr: string | null) => {
    if (!utcStr) return ''
    const d = new Date(utcStr)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const handleSaveNotice = async () => {
    try {
      const payload = {
        title: noticeForm.title, body: noticeForm.body,
        published_at: toUTCISO(noticeForm.published_at),
        is_published: noticeForm.is_published,
      }
      if (editingNotice) {
        const updated = await adminNotices.update(editingNotice.id, payload)
        setNoticeList((prev) => prev.map((n) => n.id === updated.id ? updated : n))
        flash('お知らせを更新しました')
      } else {
        const created = await adminNotices.create(payload)
        setNoticeList((prev) => [created, ...prev])
        flash('お知らせを作成しました')
      }
      setNoticeForm({ title: '', body: '', published_at: '', is_published: false })
      setEditingNotice(null)
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const handleEditNotice = (n: Notice) => {
    setEditingNotice(n)
    setNoticeForm({ title: n.title, body: n.body, published_at: toLocalDT(n.published_at), is_published: n.is_published })
  }

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return
    try {
      await adminNotices.delete(id)
      setNoticeList((prev) => prev.filter((n) => n.id !== id))
      flash('お知らせを削除しました')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const toggleComment = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const avgScore = (list: AdminFeedback[], key: 'satisfaction' | 'accuracy') => {
    if (!list.length) return '-'
    return (list.reduce((s, f) => s + f[key], 0) / list.length).toFixed(1)
  }

  const trendSummary = (key: 'avg_score' | 'avg_satisfaction' | 'avg_accuracy') => {
    const vals = trends.map((d) => d[key]).filter((v): v is number => v != null)
    if (!vals.length) return '-'
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const totalAnalyses = trends.reduce((s, d) => s + d.analysis_count, 0)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--txt3)', fontSize: 14 }}>読み込み中...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 14, color: 'var(--txt)' }}>

      {/* Topbar */}
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">CA</div>
          管理者ダッシュボード
        </div>
        <div className="topbar-right">
          <button onClick={() => router.push('/dashboard')} className="topbar-link">
            ← マイページへ戻る
          </button>
        </div>
      </nav>

      {/* Flash message */}
      {actionMsg && (
        <div style={{ padding: '0 1.5rem', paddingTop: '1rem', maxWidth: 1100, margin: '0 auto' }}>
          <div className="flash-msg">{actionMsg}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {([
          { key: 'users', label: 'ユーザー管理', count: users.length },
          { key: 'feedbacks', label: 'フィードバック', count: feedbacks.length },
          { key: 'trends', label: 'トレンド', count: null },
          { key: 'notices', label: 'お知らせ管理', count: noticeList.length },
        ] as { key: Tab; label: string; count: number | null }[]).map(t => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count !== null && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        {/* ── ユーザー管理タブ ── */}
        {tab === 'users' && (
          <>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>名前 / メール</th>
                    <th>ICF</th>
                    <th style={{ textAlign: 'center' }}>分析回数</th>
                    <th style={{ textAlign: 'center' }}>クレジット</th>
                    <th style={{ textAlign: 'center' }}>管理者</th>
                    <th>登録日</th>
                    <th>クレジット付与</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--txt)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={icfBadgeClass(u.icf_level)}>{u.icf_level.toUpperCase()}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{u.analysis_count}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{u.credits}</td>
                      <td style={{ textAlign: 'center' }}>
                        {u.is_admin
                          ? <span className="icf-badge icf-pcc">管理者</span>
                          : <span className="icf-badge icf-none">一般</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="number"
                            className="ds-input"
                            style={{ width: 72, padding: '4px 8px' }}
                            placeholder="±数"
                            value={creditInputs[u.id] || ''}
                            onChange={(e) => setCreditInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          />
                          <button onClick={() => handleAddCredits(u.id)} className="btn-sm btn-apply">適用</button>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleAdmin(u.id)}
                          disabled={u.id === me?.id}
                          className="btn-sm btn-admin"
                          style={{ opacity: u.id === me?.id ? 0.4 : 1, cursor: u.id === me?.id ? 'not-allowed' : 'pointer' }}
                        >
                          {u.is_admin ? '権限剥奪' : '管理者化'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--txt3)', padding: '2rem', fontSize: 13 }}>ユーザーがいません</p>
              )}
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--txt3)' }}>合計 {users.length} ユーザー</p>
          </>
        )}

        {/* ── フィードバックタブ ── */}
        {tab === 'feedbacks' && (
          <>
            {feedbacks.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="kpi-card">
                  <div className="kpi-label">満足度（平均）</div>
                  <div className="kpi-val">{avgScore(feedbacks, 'satisfaction')}<span className="kpi-sub"> / 5</span></div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">分析精度（平均）</div>
                  <div className="kpi-val">{avgScore(feedbacks, 'accuracy')}<span className="kpi-sub"> / 5</span></div>
                </div>
              </div>
            )}
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>ユーザー</th>
                    <th style={{ textAlign: 'center' }}>満足度</th>
                    <th style={{ textAlign: 'center' }}>分析精度</th>
                    <th>コメント</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => {
                    const isExpanded = expandedComments.has(fb.id)
                    const isLong = fb.comment != null && (fb.comment.length > 60 || fb.comment.split('\n').length > 3)
                    return (
                      <tr key={fb.id}>
                        <td style={{ color: 'var(--txt3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(fb.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{fb.user_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{fb.user_email}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={scorePillClass(fb.satisfaction)}>{fb.satisfaction}/5</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={scorePillClass(fb.accuracy)}>{fb.accuracy}/5</span>
                        </td>
                        <td style={{ maxWidth: 300, color: 'var(--txt2)' }}>
                          {fb.comment ? (
                            <div>
                              <p className={isExpanded ? '' : 'line-clamp-2'} style={{ margin: 0 }}>
                                {fb.comment}
                              </p>
                              {isLong && (
                                <button onClick={() => toggleComment(fb.id)} style={{ marginTop: 4, fontSize: 11, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  {isExpanded ? '閉じる' : '全文を表示'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--txt3)' }}>なし</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {feedbacks.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--txt3)', padding: '2rem', fontSize: 13 }}>フィードバックはまだありません</p>
              )}
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--txt3)' }}>合計 {feedbacks.length} 件</p>
          </>
        )}

        {/* ── トレンドタブ ── */}
        {tab === 'trends' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="kpi-card">
                <div className="kpi-label">分析件数（30日）</div>
                <div className="kpi-val">{totalAnalyses}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3266ad', flexShrink: 0 }} />
                  ICFスコア（平均）
                </div>
                <div className="kpi-val">{trendSummary('avg_score')}<span className="kpi-sub"> / 5</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
                  満足度（平均）
                </div>
                <div className="kpi-val">{trendSummary('avg_satisfaction')}<span className="kpi-sub"> / 5</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#BA7517', flexShrink: 0 }} />
                  分析精度（平均）
                </div>
                <div className="kpi-val">{trendSummary('avg_accuracy')}<span className="kpi-sub"> / 5</span></div>
              </div>
            </div>

            <div className="ds-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', margin: 0 }}>過去30日間のトレンド</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--txt3)' }}>
                    {[
                      { color: '#3266ad', label: 'ICFスコア' },
                      { color: '#1D9E75', label: '満足度' },
                      { color: '#BA7517', label: '分析精度' },
                    ].map(l => (
                      <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 20, height: 2, background: l.color }} />
                        {l.label}
                      </span>
                    ))}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 14, height: 10, background: '#EEEDFE', borderRadius: 2 }} />
                      分析件数
                    </span>
                  </div>
                  {trendsUpdatedAt && (
                    <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      更新: {trendsUpdatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    className="btn-refresh"
                    onClick={() => admin.listTrends().then(data => { setTrends(data); setTrendsUpdatedAt(new Date()) }).catch(() => {})}
                  >
                    今すぐ更新
                  </button>
                </div>
              </div>
              <TrendChart data={trends} />
              {trends.every((d) => d.analysis_count === 0 && d.avg_score == null) && (
                <p style={{ textAlign: 'center', color: 'var(--txt3)', padding: '2rem', fontSize: 13 }}>データがまだありません</p>
              )}
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--txt3)' }}>トレンドは24時間ごとに自動更新されます</p>
          </>
        )}

        {/* ── お知らせ管理タブ ── */}
        {tab === 'notices' && (
          <>
            <div className="ds-card" style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 16, marginTop: 0 }}>
                {editingNotice ? 'お知らせを編集' : 'お知らせを新規作成'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="ds-label">タイトル <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="お知らせのタイトル"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="ds-label">本文（Markdown対応）</label>
                  <textarea
                    className="ds-input"
                    style={{ height: 112, resize: 'vertical' }}
                    placeholder="お知らせの詳細内容"
                    value={noticeForm.body}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="ds-label">公開日時</label>
                    <input
                      type="datetime-local"
                      className="ds-input"
                      value={noticeForm.published_at}
                      onChange={(e) => setNoticeForm((f) => ({ ...f, published_at: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--txt)' }}>
                      <input
                        type="checkbox"
                        checked={noticeForm.is_published}
                        onChange={(e) => setNoticeForm((f) => ({ ...f, is_published: e.target.checked }))}
                      />
                      公開する
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveNotice}
                    disabled={!noticeForm.title}
                    className="btn-create"
                  >
                    {editingNotice ? '更新する' : '作成する'}
                  </button>
                  {editingNotice && (
                    <button
                      onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', body: '', published_at: '', is_published: false }) }}
                      className="btn-cancel-sm"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>タイトル</th>
                    <th>公開日時</th>
                    <th style={{ textAlign: 'center' }}>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {noticeList.map((n) => (
                    <tr key={n.id}>
                      <td style={{ maxWidth: 320 }}>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{n.title}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
                        {n.published_at
                          ? new Date(n.published_at).toLocaleDateString('ja-JP', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '未設定'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`publish-tag ${n.is_published ? 'pub-live' : 'pub-draft'}`}>
                          {n.is_published ? '公開中' : '下書き'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleEditNotice(n)} className="btn-sm btn-edit">編集</button>
                          <button onClick={() => handleDeleteNotice(n.id)} className="btn-sm btn-delete">削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {noticeList.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--txt3)', padding: '2rem', fontSize: 13 }}>お知らせはまだありません</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
