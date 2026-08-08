'use client'

import { SessionSummary } from '@/lib/api'
import { normalizeEngine } from '@/lib/format'

// スコア推移グラフ（依存ゼロの手書きSVG）
// - 横軸は実時間スケール（セッション日時に比例した位置にプロット）
// - 評価モード・エンジンバージョンの変化点に縦点線+ラベルを表示
// - 折れ線は境界をまたいで連続（分断しない）
export default function ScoreTrendChart({ sessionList }: { sessionList: SessionSummary[] }) {
  if (sessionList.length === 0) return null
  // APIは新しい順なので古い順に並べ替え
  const sorted = [...sessionList].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const W = 520, H = 152
  const pL = 38, pR = 16, pT = 22, pB = 28
  const innerW = W - pL - pR
  const innerH = H - pT - pB

  const times = sorted.map(s => new Date(s.created_at).getTime())
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const tRange = tMax - tMin
  const xAt = (t: number) => tRange === 0 ? pL + innerW / 2 : pL + ((t - tMin) / tRange) * innerW

  const scores = sorted.map(s => s.avg_score)
  const rawMin = Math.min(...scores)
  const rawMax = Math.max(...scores)
  const yMin = Math.max(0, rawMin - 0.5)
  const yMax = Math.min(5, rawMax + 0.5)
  const range = yMax - yMin || 1
  const yAt = (v: number) => pT + innerH - ((v - yMin) / range) * innerH

  const pts = sorted.map((s, i) => ({ x: xAt(times[i]), y: yAt(s.avg_score) }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fillPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(pT + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pT + innerH).toFixed(1)} Z`
    : ''
  const step = range / 4
  const ticks = [0, 1, 2, 3, 4].map(i => parseFloat((yMin + step * i).toFixed(1)))

  // 評価モード/エンジンバージョンの境界検出（変化点の前後中間に縦点線）
  const engines = sorted.map(s => normalizeEngine(s))
  const boundaries: Array<{ x: number; label: string }> = []
  for (let i = 1; i < sorted.length; i++) {
    if (engines[i].mode !== engines[i - 1].mode || engines[i].version !== engines[i - 1].version) {
      boundaries.push({ x: (pts[i - 1].x + pts[i].x) / 2, label: engines[i].label })
    }
  }

  // X軸日付ラベル（実時間軸なので密集する点はラベルを間引く）
  const MIN_LABEL_GAP = 52
  let lastLabelX = -Infinity
  const dateLabels: Array<{ x: number; text: string }> = []
  pts.forEach((p, i) => {
    if (p.x - lastLabelX >= MIN_LABEL_GAP) {
      dateLabels.push({
        x: p.x,
        text: new Date(sorted[i].created_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
      })
      lastLabelX = p.x
    }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} role="img" aria-label="スコア推移グラフ">
      {ticks.map(t => (
        <g key={t}>
          <line x1={pL} x2={W - pR} y1={yAt(t)} y2={yAt(t)} stroke="var(--surface3)" strokeWidth="1" />
          <text x={pL - 4} y={yAt(t) + 4} textAnchor="end" fontSize="9" fill="var(--txt3)">{t.toFixed(1)}</text>
        </g>
      ))}
      {boundaries.map((b, i) => (
        <g key={`b${i}`}>
          <line x1={b.x} x2={b.x} y1={pT - 4} y2={pT + innerH} stroke="var(--border2)" strokeWidth="1" strokeDasharray="4 3" />
          <text
            x={Math.min(Math.max(b.x, pL + 30), W - pR - 30)}
            y={pT - 8}
            textAnchor="middle"
            fontSize="9"
            fill="var(--txt3)"
          >
            {b.label}に切替
          </text>
        </g>
      ))}
      {fillPath && <path d={fillPath} fill="var(--teal)" fillOpacity={0.12} />}
      {pts.length > 1 && <path d={linePath} fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill="var(--teal)" stroke="var(--surface)" strokeWidth={2}>
          <title>{`${new Date(sorted[i].created_at).toLocaleDateString('ja-JP')} 平均 ${sorted[i].avg_score.toFixed(1)} / ${engines[i].label}`}</title>
        </circle>
      ))}
      {dateLabels.map((l, i) => (
        <text key={`d${i}`} x={l.x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--txt3)">{l.text}</text>
      ))}
    </svg>
  )
}
