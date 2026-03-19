'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { admin, auth, adminNotices, UserInfo, AdminFeedback, AdminTrendDataPoint, Notice } from '@/lib/api'

type Tab = 'users' | 'feedbacks' | 'trends' | 'notices'

// ---- SVG Trend Chart ----
function TrendChart({ data }: { data: AdminTrendDataPoint[] }) {
  if (data.length === 0) return null

  const W = 760
  const scoreTop = 16
  const scoreH = 180
  const scoreBot = scoreTop + scoreH      // 196
  const countTop = scoreBot + 12          // 208
  const countH = 40
  const countBot = countTop + countH      // 248
  const labelsY = countBot + 18          // 266
  const H = labelsY + 14                 // 280
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Score grid lines + Y labels */}
      {scoreTicks.map((t) => (
        <g key={t}>
          <line x1={pL} x2={W - pR} y1={yScore(t)} y2={yScore(t)} stroke="#F3F4F6" strokeWidth="1" />
          <text x={pL - 6} y={yScore(t) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{t}</text>
        </g>
      ))}

      {/* Analysis count bars */}
      {data.map((pt, i) => {
        if (pt.analysis_count === 0) return null
        const bH = (pt.analysis_count / maxCount) * countH
        return (
          <rect
            key={i}
            x={xAt(i) - barW / 2}
            y={countBot - bH}
            width={barW}
            height={bH}
            fill="#DBEAFE"
            rx="1"
          />
        )
      })}

      {/* Lines */}
      <path d={makeLine(data.map((d) => d.avg_score))} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makeLine(data.map((d) => d.avg_satisfaction))} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makeLine(data.map((d) => d.avg_accuracy))} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on data points */}
      {data.map((pt, i) => (
        <g key={i}>
          {pt.avg_score != null && (
            <circle cx={xAt(i)} cy={yScore(pt.avg_score)} r="3" fill="#3B82F6" />
          )}
          {pt.avg_satisfaction != null && (
            <circle cx={xAt(i)} cy={yScore(pt.avg_satisfaction)} r="3" fill="#10B981" />
          )}
          {pt.avg_accuracy != null && (
            <circle cx={xAt(i)} cy={yScore(pt.avg_accuracy)} r="3" fill="#F59E0B" />
          )}
        </g>
      ))}

      {/* X axis labels */}
      {data.map((pt, i) => {
        if (n > 10 && i % 5 !== 0 && i !== n - 1) return null
        return (
          <text key={i} x={xAt(i)} y={labelsY} textAnchor="middle" fontSize="9" fill="#9CA3AF">
            {pt.date.slice(5)}
          </text>
        )
      })}

      {/* Axes */}
      <line x1={pL} x2={pL} y1={scoreTop} y2={countBot} stroke="#E5E7EB" strokeWidth="1" />
      <line x1={pL} x2={W - pR} y1={scoreBot} y2={scoreBot} stroke="#E5E7EB" strokeWidth="1" />
      <line x1={pL} x2={W - pR} y1={countBot} y2={countBot} stroke="#E5E7EB" strokeWidth="1" />

      {/* Count axis label */}
      <text x={pL - 6} y={countTop + 10} textAnchor="end" fontSize="9" fill="#93C5FD">{maxCount}</text>
      <text x={pL - 6} y={countBot + 4} textAnchor="end" fontSize="9" fill="#93C5FD">0</text>
    </svg>
  )
}

// ---- Main page ----
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
        if (!user.is_admin) {
          router.replace('/dashboard')
          return
        }
        setMe(user)
        return Promise.all([admin.listUsers(), admin.listFeedbacks()])
      })
      .then((results) => {
        if (results) {
          setUsers(results[0])
          setFeedbacks(results[1])
        }
        return adminNotices.list()
      })
      .then((nl) => { if (nl) setNoticeList(nl) })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  // Trend auto-refresh every 24 hours
  useEffect(() => {
    const fetchTrends = () => {
      admin.listTrends()
        .then((data) => {
          setTrends(data)
          setTrendsUpdatedAt(new Date())
        })
        .catch(() => {})
    }
    fetchTrends()
    const timer = setInterval(fetchTrends, 24 * 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleAddCredits = async (userId: string) => {
    const amount = parseInt(creditInputs[userId] || '0', 10)
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

  // datetime-local（ローカル時刻）→ UTC ISO文字列
  const toUTCISO = (localDT: string) => localDT ? new Date(localDT).toISOString() : null
  // UTC ISO文字列 → datetime-local 入力用ローカル時刻
  const toLocalDT = (utcStr: string | null) => {
    if (!utcStr) return ''
    const d = new Date(utcStr)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const handleSaveNotice = async () => {
    try {
      const payload = {
        title: noticeForm.title,
        body: noticeForm.body,
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
    setNoticeForm({
      title: n.title,
      body: n.body,
      published_at: toLocalDT(n.published_at),
      is_published: n.is_published,
    })
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
    const avg = list.reduce((s, f) => s + f[key], 0) / list.length
    return avg.toFixed(1)
  }

  const trendSummary = (key: 'avg_score' | 'avg_satisfaction' | 'avg_accuracy') => {
    const vals = trends.map((d) => d[key]).filter((v): v is number => v != null)
    if (!vals.length) return '-'
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const totalAnalyses = trends.reduce((s, d) => s + d.analysis_count, 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:underline">
            マイページへ戻る
          </button>
        </div>

        {actionMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            {actionMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'users'
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ユーザー管理
            <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{users.length}</span>
          </button>
          <button
            onClick={() => setTab('feedbacks')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'feedbacks'
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            フィードバック
            <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{feedbacks.length}</span>
          </button>
          <button
            onClick={() => setTab('trends')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'trends'
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            トレンド
          </button>
          <button
            onClick={() => setTab('notices')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'notices'
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            お知らせ管理
            <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{noticeList.length}</span>
          </button>
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <>
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-left">
                    <th className="px-4 py-3">名前</th>
                    <th className="px-4 py-3">メール</th>
                    <th className="px-4 py-3">ICF</th>
                    <th className="px-4 py-3 text-center">分析回数</th>
                    <th className="px-4 py-3 text-center">クレジット</th>
                    <th className="px-4 py-3 text-center">管理者</th>
                    <th className="px-4 py-3">登録日</th>
                    <th className="px-4 py-3">クレジット付与</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 uppercase text-gray-600">{u.icf_level}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{u.analysis_count}</td>
                      <td className="px-4 py-3 text-center font-medium">{u.credits}</td>
                      <td className="px-4 py-3 text-center">
                        {u.is_admin ? (
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">管理者</span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">一般</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="±数"
                            value={creditInputs[u.id] || ''}
                            onChange={(e) => setCreditInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => handleAddCredits(u.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            適用
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleAdmin(u.id)}
                          disabled={u.id === me?.id}
                          className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {u.is_admin ? '権限剥奪' : '管理者化'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-gray-400 py-8">ユーザーがいません</p>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-400">合計 {users.length} ユーザー</p>
          </>
        )}

        {/* Feedbacks tab */}
        {tab === 'feedbacks' && (
          <>
            {feedbacks.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-xl shadow px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">満足度（平均）</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {avgScore(feedbacks, 'satisfaction')}
                    <span className="text-sm font-normal text-gray-400"> / 5</span>
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">分析精度（平均）</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {avgScore(feedbacks, 'accuracy')}
                    <span className="text-sm font-normal text-gray-400"> / 5</span>
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-left">
                    <th className="px-4 py-3">日時</th>
                    <th className="px-4 py-3">ユーザー</th>
                    <th className="px-4 py-3 text-center">満足度</th>
                    <th className="px-4 py-3 text-center">分析精度</th>
                    <th className="px-4 py-3">コメント</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => {
                    const isExpanded = expandedComments.has(fb.id)
                    const isLong = fb.comment != null && (fb.comment.length > 60 || fb.comment.split('\n').length > 3)
                    return (
                      <tr key={fb.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(fb.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{fb.user_name}</p>
                          <p className="text-xs text-gray-400">{fb.user_email}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-900">{fb.satisfaction}</span>
                          <span className="text-gray-400 text-xs"> / 5</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-900">{fb.accuracy}</span>
                          <span className="text-gray-400 text-xs"> / 5</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          {fb.comment ? (
                            <div>
                              <p className={isExpanded ? undefined : 'line-clamp-3'}>{fb.comment}</p>
                              {isLong && (
                                <button
                                  onClick={() => toggleComment(fb.id)}
                                  className="mt-1 text-xs text-blue-500 hover:text-blue-700"
                                >
                                  {isExpanded ? '閉じる' : '全文を表示'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">なし</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {feedbacks.length === 0 && (
                <p className="text-center text-gray-400 py-8">フィードバックはまだありません</p>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-400">合計 {feedbacks.length} 件</p>
          </>
        )}

        {/* Trends tab */}
        {tab === 'trends' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <p className="text-xs text-gray-500 mb-1">分析件数（30日）</p>
                <p className="text-2xl font-bold text-gray-900">{totalAnalyses}</p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <p className="text-xs text-gray-500">ICFスコア（平均）</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {trendSummary('avg_score')}
                  <span className="text-sm font-normal text-gray-400"> / 5</span>
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <p className="text-xs text-gray-500">満足度（平均）</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {trendSummary('avg_satisfaction')}
                  <span className="text-sm font-normal text-gray-400"> / 5</span>
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <p className="text-xs text-gray-500">分析精度（平均）</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {trendSummary('avg_accuracy')}
                  <span className="text-sm font-normal text-gray-400"> / 5</span>
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">過去30日間のトレンド</h2>
                <div className="flex items-center gap-4">
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 h-0.5 bg-blue-500" />ICFスコア
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 h-0.5 bg-emerald-500" />満足度
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 h-0.5 bg-amber-500" />分析精度
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-4 h-3 bg-blue-100 rounded-sm" />分析件数
                    </span>
                  </div>
                  {trendsUpdatedAt && (
                    <p className="text-xs text-gray-400">
                      更新: {trendsUpdatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      admin.listTrends().then((data) => { setTrends(data); setTrendsUpdatedAt(new Date()) }).catch(() => {})
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded"
                  >
                    今すぐ更新
                  </button>
                </div>
              </div>
              <TrendChart data={trends} />
              {trends.every((d) => d.analysis_count === 0 && d.avg_score == null) && (
                <p className="text-center text-gray-400 py-8">データがまだありません</p>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400">トレンドは24時間ごとに自動更新されます</p>
          </>
        )}

        {/* Notices tab */}
        {tab === 'notices' && (
          <>
            {/* Form */}
            <div className="bg-white rounded-xl shadow p-5 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                {editingNotice ? 'お知らせを編集' : 'お知らせを新規作成'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">タイトル</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="お知らせのタイトル"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">本文（Markdown対応）</label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-28 resize-y"
                    placeholder="お知らせの詳細内容"
                    value={noticeForm.body}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">公開日時</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      value={noticeForm.published_at}
                      onChange={(e) => setNoticeForm((f) => ({ ...f, published_at: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noticeForm.is_published}
                        onChange={(e) => setNoticeForm((f) => ({ ...f, is_published: e.target.checked }))}
                      />
                      <span className="text-sm text-gray-700">公開する</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotice}
                    disabled={!noticeForm.title || !noticeForm.body}
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {editingNotice ? '更新する' : '作成する'}
                  </button>
                  {editingNotice && (
                    <button
                      onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', body: '', published_at: '', is_published: false }) }}
                      className="text-sm border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-left">
                    <th className="px-4 py-3">タイトル</th>
                    <th className="px-4 py-3">公開日時</th>
                    <th className="px-4 py-3 text-center">公開状態</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {noticeList.map((n) => (
                    <tr key={n.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{n.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {n.published_at
                          ? new Date(n.published_at).toLocaleDateString('ja-JP', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '未設定'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.is_published ? (
                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">公開中</span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">非公開</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditNotice(n)}
                            className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-xs border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {noticeList.length === 0 && (
                <p className="text-center text-gray-400 py-8">お知らせはまだありません</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
