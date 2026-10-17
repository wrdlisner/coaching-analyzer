'use client'

import { useState } from 'react'
import { googleStartUrl } from '@/lib/api'

// 「Google で続ける」ボタン。Google のブランドガイドラインに沿った白地のボタン。
// G ロゴは Google 公式の素材(signin-assets の Light / Show text=No)から切り出した public/google-g-logo.png を使う。
export default function GoogleButton({ referralCode }: { referralCode?: string | null }) {
  const [logoOk, setLogoOk] = useState(true)
  return (
    <a
      href={googleStartUrl(referralCode)}
      className="google-btn w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
      // ダークモードでも Google 公式の Light テーマ(白地・濃い文字)で表示する。
      // globals.css の html.dark .bg-white 等の上書きを受けないよう、色は Tailwind のクラスではなく専用クラスで指定
      style={{ fontFamily: "'Roboto', 'Hiragino Sans', 'Noto Sans JP', sans-serif" }}
    >
      {logoOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/google-g-logo.png" alt="" width={18} height={18} onError={() => setLogoOk(false)} />
      )}
      <span>Google で続ける</span>
    </a>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">または</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}
