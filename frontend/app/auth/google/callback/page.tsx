'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { googleAuth, setToken, takeTicketFromHash } from '@/lib/api'
import { LoadingScreen } from '@/components/auth/AuthShell'

// Google 認証後の着地点。#ticket= を JWT に交換してダッシュボードへ
export default function GoogleCallbackPage() {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    // チケットは1回しか使えないので、開発時の二重実行でも1回だけ交換する
    if (started.current) return
    started.current = true

    const ticket = takeTicketFromHash()
    if (!ticket) {
      router.replace('/login?error=google_ticket_expired')
      return
    }
    googleAuth
      .exchange(ticket)
      .then((res) => {
        setToken(res.access_token)
        router.replace('/dashboard')
      })
      .catch(() => router.replace('/login?error=google_ticket_expired'))
  }, [router])

  return <LoadingScreen message="ログインしています..." />
}
