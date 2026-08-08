// ダッシュボード共有の定数・小ユーティリティ

export const REASON_LABELS: Record<string, string> = {
  analysis: '分析実行',
  feedback: 'フィードバック',
  bonus: '新規登録ボーナス',
  referral: '友達紹介ボーナス',
  purchase: 'クレジット購入',
  refund: '返金（分析エラー）',
}

export const ICF_LEVEL_LABELS: Record<string, string> = {
  none: '未設定', acc: 'ACC', pcc: 'PCC', mcc: 'MCC',
}

export function reasonBadgeClass(reason: string): string {
  if (reason === 'purchase') return 'reason-badge reason-buy'
  if (reason === 'bonus' || reason === 'referral' || reason === 'refund') return 'reason-badge reason-bonus'
  if (reason === 'analysis') return 'reason-badge reason-use'
  return 'reason-badge reason-other'
}

export type PackOption = { pack: '1' | '3' | '10'; label: string; price: string; credits: number; save?: string }

export const PACK_OPTIONS: PackOption[] = [
  { pack: '1',  label: '1回',      price: '¥500',   credits: 1 },
  { pack: '3',  label: '3回パック', price: '¥1,200', credits: 3,  save: '¥300お得' },
  { pack: '10', label: '10回パック', price: '¥3,500', credits: 10, save: '¥1,500お得' },
]

// TODO: 暫定閾値（引き継ぎ書§4）。残高がこの値以下のときだけホームに購入ブロックを表示
export const LOW_CREDIT_THRESHOLD = 3
