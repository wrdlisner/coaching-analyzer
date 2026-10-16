import Link from 'next/link'

// 認証まわりの画面の共通レイアウト(ロゴ・見出し・カード)
export default function AuthShell({
  title,
  subtitle,
  backHref = '/',
  backLabel = '← トップに戻る',
  children,
}: {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-left mb-2">
          <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            {backLabel}
          </Link>
        </div>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[var(--purple)] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">Coachmark</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      {message}
    </div>
  )
}

export function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">{message}</div>
    </div>
  )
}

// /login?error=... で表示する文言(バックエンドの auth_google.py と対応)
export const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: 'Googleでのログインがキャンセルされました。',
  google_state: 'Googleでのログインに失敗しました。もう一度お試しください。',
  google_failed: 'Googleでのログインに失敗しました。もう一度お試しください。',
  google_email_unverified: 'このGoogleアカウントのメールアドレスが確認されていないため、ログインできません。',
  google_other_account: 'このメールアドレスのアカウントには、別のGoogleアカウントが連携されています。連携済みのGoogleアカウントでログインしてください。',
  google_unavailable: '現在Googleでのログインをご利用いただけません。メールアドレスとパスワードでログインしてください。',
  google_ticket_expired: '時間が経ったため手続きが無効になりました。もう一度「Google で続ける」からお試しください。',
}
