import Link from 'next/link'

export default function MentorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-4xl mb-4">🤝</div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          メンターコーチのマッチング
        </h1>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          メンターコーチのマッチング機能は現在準備中です。<br />
          ご興味のある方・メンターとして登録をご希望の方は<br />
          こちらからご連絡ください。
        </p>
        <a
          href="mailto:info@coaching-analyzer.com"
          className="btn-primary block w-full py-3 mb-3"
        >
          お問い合わせ →
        </a>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← ダッシュボードに戻る
        </Link>
      </div>
    </div>
  )
}
