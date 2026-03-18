'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { notices, Notice, getToken } from '@/lib/api'

export default function NoticeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      router.push('/login')
      return
    }
    notices.get(id)
      .then(setNotice)
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!notice) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
            ← 戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded">NEW</span>
            <span className="text-sm text-gray-500">
              {notice.published_at
                ? new Date(notice.published_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })
                : ''}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-6">{notice.title}</h1>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {notice.body}
          </div>
        </div>
      </main>
    </div>
  )
}
