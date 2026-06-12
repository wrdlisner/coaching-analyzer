export type ChangeType = 'new' | 'fix' | 'improve'

export interface ChangeEntry {
  date: string
  version?: string
  changes: { type: ChangeType; text: string }[]
}

export const changelog: ChangeEntry[] = [
  {
    date: '2026-06-12',
    changes: [
      { type: 'new', text: '分析エラー・中断時にクレジットを自動返金（履歴に「返金（分析エラー）」と表示）' },
      { type: 'improve', text: 'パスワードリセットの安全性を向上（リセットリンクの管理方法を見直し）' },
      { type: 'improve', text: '新規登録時のパスワードを8文字以上必須に変更' },
      { type: 'improve', text: 'メンタープロフィール写真をアップロード時に自動最適化（一覧の表示速度向上）' },
      { type: 'improve', text: '決済処理とクーポン適用の安定性を向上' },
      { type: 'fix', text: '公開日時の設定によってお知らせが表示されないことがある問題を修正' },
      { type: 'fix', text: '保存期間（180日）を過ぎた分析データの自動削除処理を修正' },
    ],
  },
  {
    date: '2026-05-14',
    changes: [
      { type: 'new', text: 'アップデート履歴ページを追加（/updates）' },
    ],
  },
  {
    date: '2026-05-09',
    changes: [
      { type: 'fix', text: '旧RailwayドメインからのアクセスをCoachmarkドメインへ自動リダイレクト' },
      { type: 'fix', text: 'PDFのスコア端数表示を統一し、ファイル名に分析日付を追加' },
    ],
  },
  {
    date: '2026-05-08',
    changes: [
      { type: 'improve', text: 'サービス名をCoachingAnalyzerからCoachmarkに変更' },
      { type: 'new', text: '利用規約ページを追加（/terms）' },
      { type: 'fix', text: 'メール送信をResend公式SDKに切り替え（Cloudflareブロック回避）' },
    ],
  },
  {
    date: '2026-05-07',
    changes: [
      { type: 'new', text: 'パスワードリセット機能を追加（メールでのリセットリンク送信）' },
      { type: 'new', text: '管理者画面にクレジット購入履歴タブを追加' },
    ],
  },
  {
    date: '2026-05-06',
    changes: [
      { type: 'new', text: 'メンターセッション時間・料金フィールドを追加' },
      { type: 'improve', text: 'メンターガイドをダッシュボードからメンター一覧ページへ移動' },
      { type: 'fix', text: 'メンター一覧の自己紹介文を全文表示に変更' },
      { type: 'fix', text: 'プロフィール写真をBase64形式でDB保存する方式に変更' },
    ],
  },
]

export const typeLabel: Record<ChangeType, string> = {
  new: '新機能',
  fix: '修正',
  improve: '改善',
}

export const typeStyle: Record<ChangeType, string> = {
  new: 'bg-blue-100 text-blue-700',
  fix: 'bg-red-100 text-red-600',
  improve: 'bg-green-100 text-green-700',
}
