'use client'

import { useEffect, useRef, useState } from 'react'
import { UserInfo } from '@/lib/api'

// 上部バー右端の「☰ メニュー」。PC・スマホ共通(PCは右上に小窓、スマホは全幅で開く)
export default function TopbarMenu({
  user,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onLogout,
}: {
  user: UserInfo | null
  isDark: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // メニューの外を押す・Escキーで閉じる
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: () => void) => () => { setOpen(false); action() }

  return (
    <div className="topbar-menu-root" ref={rootRef}>
      <button
        className="topbar-menu-btn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls="topbar-menu"
        aria-haspopup="menu"
      >
        {open ? '✕ 閉じる' : '☰ メニュー'}
      </button>
      {open && (
        <div id="topbar-menu" className="topbar-menu" role="menu">
          {user && <span className="topbar-menu-user">{user.name} さん</span>}
          <button role="menuitem" onClick={choose(onOpenSettings)}>⚙️ アカウント設定</button>
          {user?.is_admin && <a role="menuitem" href="/admin">管理者ページ</a>}
          {user?.role === 'mentor' && <a role="menuitem" href="/mentors">メンター一覧</a>}
          <button role="menuitem" onClick={choose(onToggleTheme)}>
            {isDark ? '☀️ ライトモードにする' : '🌙 ダークモードにする'}
          </button>
          <button role="menuitem" onClick={choose(onLogout)}>ログアウト</button>
        </div>
      )}
    </div>
  )
}
