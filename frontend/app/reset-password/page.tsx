'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('リセットリンクが無効です。もう一度お試しください。')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }
    if (form.password !== form.confirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    try {
      await auth.resetPassword(token, form.password)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">新しいパスワードを設定</h1>
        </div>

        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">パスワードを変更しました</h2>
              <p className="text-sm text-gray-600">
                3秒後にログインページへ移動します…
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-sm text-blue-600 hover:underline"
              >
                今すぐログインページへ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード <span className="text-gray-400 font-normal">（8文字以上）</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-20"
                    placeholder="新しいパスワード"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    disabled={!token}
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
                  パスワード（確認）
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field"
                  placeholder="もう一度入力"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  disabled={!token}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                  {!token && (
                    <p className="mt-2">
                      <Link href="/forgot-password" className="underline font-medium">
                        パスワードリセットを最初からやり直す
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="btn-primary w-full py-3"
              >
                {loading ? '変更中...' : 'パスワードを変更する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-500">読み込み中...</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
