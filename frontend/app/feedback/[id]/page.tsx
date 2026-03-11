'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { feedback, getToken } from '@/lib/api'

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl transition-colors focus:outline-none"
          >
            <span
              className={
                star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-200'
              }
            >
              ★
            </span>
          </button>
        ))}
        {value > 0 && (
          <span className="text-sm text-gray-500 self-center ml-1">{value}/5</span>
        )}
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [satisfaction, setSatisfaction] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (satisfaction === 0 || accuracy === 0) {
      setError('評価を選択してください')
      return
    }
    setError('')
    setLoading(true)
    try {
      await feedback.submit(id, { satisfaction, accuracy, comment })
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'フィードバックの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/report/${id}`}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            ← 戻る
          </Link>
        </div>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">フィードバック</h1>
            <p className="text-sm text-gray-500 mt-1">
              送信するとクレジットが +1 付与されます
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <StarRating
              value={satisfaction}
              onChange={setSatisfaction}
              label="総合満足度"
            />
            <StarRating
              value={accuracy}
              onChange={setAccuracy}
              label="分析精度"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自由コメント（任意）
              </label>
              <textarea
                rows={4}
                className="input-field resize-none"
                placeholder="分析の感想や改善点をお聞かせください"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href={`/report/${id}`}
                className="btn-secondary flex-1 py-3 text-center"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={loading || satisfaction === 0 || accuracy === 0}
                className="btn-primary flex-1 py-3"
              >
                {loading ? '送信中...' : 'フィードバックを送信 (+1クレジット)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
