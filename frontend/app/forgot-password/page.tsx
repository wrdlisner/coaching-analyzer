'use client'

import { useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-left mb-2">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← ログインに戻る
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoachingAnalyzer</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">パスワードをお忘れですか？</h1>
          <p className="text-sm text-gray-500 mt-2">登録済みのメールアドレスを入力してください</p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">メールを送信しました</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>{email}</strong> にパスワードリセット用のリンクを送信しました。<br />
                メールが届かない場合は迷惑メールフォルダもご確認ください。
              </p>
              <p className="text-xs text-gray-400 mt-4">リンクの有効期限は1時間です</p>
              <Link
                href="/login"
                className="inline-block mt-6 text-sm text-blue-600 hover:underline"
              >
                ログインページに戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? '送信中...' : 'リセットリンクを送信'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-blue-600 hover:underline">
                  ログインに戻る
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
