'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { admin, auth, UserInfo } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<UserInfo | null>(null)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({})
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    auth.getMe()
      .then((user) => {
        if (!user.is_admin) {
          router.replace('/dashboard')
          return
        }
        setMe(user)
        return admin.listUsers()
      })
      .then((list) => { if (list) setUsers(list) })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>

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

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3">名前</th>
                <th className="px-4 py-3">メール</th>
                <th className="px-4 py-3">ICF</th>
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

        <p className="mt-4 text-xs text-gray-400">
          合計 {users.length} ユーザー
        </p>
      </div>
    </div>
  )
}
