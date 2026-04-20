'use client'

import { useEffect } from 'react'

/** TOPページ用：マウント中は html.light を強制し、離脱時にユーザー設定を復元する */
export function LightModeGuard() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    return () => {
      document.documentElement.classList.remove('light')
      try {
        const stored = localStorage.getItem('theme')
        if (stored === 'dark') {
          document.documentElement.classList.add('dark')
        } else if (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.add('light')
        }
      } catch {
        document.documentElement.classList.add('light')
      }
    }
  }, [])
  return null
}
