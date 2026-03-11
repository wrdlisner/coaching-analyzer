import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ICFコーチング分析ツール',
  description: 'ICFコアコンピテンシーに基づくコーチングセッション分析',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
