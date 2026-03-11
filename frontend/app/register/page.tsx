'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, setToken } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    icf_level: 'none',
  })
  const [consents, setConsents] = useState([false, false, false])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const allConsentsChecked = consents.every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allConsentsChecked) {
      setError('すべての同意事項にチェックしてください')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await auth.register(form)
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const consentItems = [
    '本ツールの評価はAIによる自動分析であり、ICF公式の評価ではありません',
    '個人情報（音声・テキストデータ）はサービス改善のために使用される場合があります（個人が特定されることはありません）',
    '分析結果は参考情報であり、資格審査への保証はありません',
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-left mb-2">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← トップに戻る
          </a>
        </div>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">アカウント登録</h1>
          <p className="text-gray-600 text-sm mt-1">無料登録で3クレジット付与</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                氏名
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="山田 太郎"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="input-field pr-20"
                  placeholder="8文字以上"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ICF資格レベル
              </label>
              <select
                className="input-field"
                value={form.icf_level}
                onChange={(e) => setForm({ ...form, icf_level: e.target.value })}
              >
                <option value="none">未取得</option>
                <option value="acc">ACC</option>
                <option value="pcc">PCC</option>
                <option value="mcc">MCC</option>
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-gray-700">利用規約への同意</p>
              {consentItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300"
                    checked={consents[i]}
                    onChange={(e) => {
                      const next = [...consents]
                      next[i] = e.target.checked
                      setConsents(next)
                    }}
                  />
                  <span className="text-sm text-gray-600">{item}</span>
                </label>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allConsentsChecked}
              className="btn-primary w-full py-3"
            >
              {loading ? '登録中...' : '登録する（+3クレジット）'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
