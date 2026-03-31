'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { feedback, getToken, CouponInfo } from '@/lib/api'

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

function CouponSuccess({ coupon }: { coupon: CouponInfo }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresAt = new Date(coupon.expires_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <div className="text-center space-y-6">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">フィードバックありがとうございます！</h2>
        <p className="text-sm text-gray-500">クーポンを獲得しました</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="text-3xl font-bold text-blue-600 mb-1">¥{coupon.discount_amount} OFF</div>
        <div className="text-xs text-gray-500 mb-4">クレジット購入時に使えるクーポン</div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3">
          <span className="flex-1 font-mono text-lg font-semibold tracking-widest text-gray-800">
            {coupon.code}
          </span>
          <button
            onClick={handleCopy}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
          >
            {copied ? 'コピー済み' : 'コピー'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">有効期限：{expiresAt}まで</p>
      </div>

      <p className="text-xs text-gray-500">
        コードはダッシュボードの「クーポン」からいつでも確認できます
      </p>

      <Link
        href="/dashboard"
        className="btn-primary block w-full py-3 text-center"
      >
        ダッシュボードへ
      </Link>
    </div>
  )
}

function NoCoponSuccess() {
  return (
    <div className="text-center space-y-6">
      <div className="text-5xl">✅</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">フィードバックありがとうございます！</h2>
        <p className="text-sm text-gray-500">
          未使用クーポンが上限（5枚）に達しているため、今回はクーポンを発行できませんでした。
        </p>
      </div>
      <Link
        href="/dashboard"
        className="btn-primary block w-full py-3 text-center"
      >
        ダッシュボードへ
      </Link>
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
  const [submittedCoupon, setSubmittedCoupon] = useState<CouponInfo | null | undefined>(undefined)

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
      const res = await feedback.submit(id, { satisfaction, accuracy, comment })
      setSubmittedCoupon(res.coupon)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'フィードバックの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 送信後の表示
  if (submittedCoupon !== undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="card">
            {submittedCoupon ? (
              <CouponSuccess coupon={submittedCoupon} />
            ) : (
              <NoCoponSuccess />
            )}
          </div>
        </div>
      </div>
    )
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
              送信すると¥100クーポンをプレゼント（累計3回目は¥200、5回目は¥300）
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
                {loading ? '送信中...' : 'フィードバックを送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
