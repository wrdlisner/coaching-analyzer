'use client'

import Link from 'next/link'

// 登録時の同意事項。メール登録と Google 登録で共通
export const CONSENT_ITEMS = [
  '本ツールの評価はAIによる自動分析であり、ICF公式の評価ではありません',
  '分析データはサービス改善のために利用される場合があります（データには個人が特定される情報は含まれません）',
  '分析結果は参考情報であり、資格審査への保証はありません',
]

export function initialConsents(): boolean[] {
  return CONSENT_ITEMS.map(() => false)
}

export default function ConsentChecklist({
  consents,
  onChange,
}: {
  consents: boolean[]
  onChange: (next: boolean[]) => void
}) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm font-medium text-gray-700">
        <Link href="/terms" target="_blank" className="text-[var(--purple)] hover:underline">
          利用規約
        </Link>
        への同意
      </p>
      {CONSENT_ITEMS.map((item, i) => (
        <label key={i} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-[var(--purple)] rounded border-gray-300"
            checked={consents[i]}
            onChange={(e) => {
              const next = [...consents]
              next[i] = e.target.checked
              onChange(next)
            }}
          />
          <span className="text-sm text-gray-600">{item}</span>
        </label>
      ))}
    </div>
  )
}
