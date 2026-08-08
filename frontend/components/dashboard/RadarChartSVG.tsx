'use client'

import { SessionSummary } from '@/lib/api'

// C1〜C8 の略記ラベルと正式名称（ツールチップ用）
const COMP_SHORT: Record<number, string> = {
  1: '倫理', 2: 'マインド', 3: '合意', 4: '信頼',
  5: 'プレゼンス', 6: '傾聴', 7: '気づき', 8: '成長支援',
}
const COMP_FULL: Record<number, string> = {
  1: 'C1 倫理に従った実践',
  2: 'C2 コーチングマインドセットの体現',
  3: 'C3 合意内容の確立と維持',
  4: 'C4 信頼と安心感の育成',
  5: 'C5 プレゼンスの維持',
  6: 'C6 積極的傾聴',
  7: 'C7 気づきの喚起',
  8: 'C8 クライアントの成長の促進',
}

// コンピテンシー別レーダーチャート（直近5回の分析の平均・5.0満点・手書きSVG）
// TODO: 過去との重ね描き・移動平均は今回スコープ外（引き継ぎ書§2-A）
export default function RadarChartSVG({ sessionList }: { sessionList: SessionSummary[] }) {
  // 直近5回（APIは新しい順）から C1〜C8 の平均を計算
  const recent = sessionList.slice(0, 5)
  const sums: Record<number, { total: number; count: number }> = {}
  recent.forEach(s => {
    s.scores?.competencies?.forEach(c => {
      if (c.id >= 1 && c.id <= 8 && typeof c.score === 'number') {
        if (!sums[c.id]) sums[c.id] = { total: 0, count: 0 }
        sums[c.id].total += c.score
        sums[c.id].count += 1
      }
    })
  })

  const ids = [1, 2, 3, 4, 5, 6, 7, 8]
  const hasData = ids.some(id => sums[id]?.count > 0)
  if (!hasData) {
    return (
      <p style={{ fontSize: 13, color: 'var(--txt3)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>
        分析するとレーダーチャートが表示されます
      </p>
    )
  }

  // 小数1桁丸め
  const avgs = ids.map(id => {
    const s = sums[id]
    return s && s.count > 0 ? Math.round((s.total / s.count) * 10) / 10 : 0
  })

  const W = 320, H = 250
  const cx = W / 2, cy = H / 2 + 4
  const R = 82
  const angleAt = (i: number) => ((-90 + i * 45) * Math.PI) / 180
  const pointAt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angleAt(i)),
    y: cy + r * Math.sin(angleAt(i)),
  })

  const gridLevels = [1, 2, 3, 4, 5]
  const gridPolys = gridLevels.map(level =>
    ids.map((_, i) => {
      const p = pointAt(i, (level / 5) * R)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    }).join(' ')
  )
  const dataPoly = ids.map((_, i) => {
    const p = pointAt(i, (avgs[i] / 5) * R)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }} role="img" aria-label="コンピテンシー別レーダーチャート（直近5回の平均）">
      {gridPolys.map((poly, i) => (
        <polygon key={i} points={poly} fill="none" stroke="var(--surface3)" strokeWidth={i === gridPolys.length - 1 ? 1.2 : 0.7} />
      ))}
      {ids.map((_, i) => {
        const p = pointAt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--surface3)" strokeWidth="0.7" />
      })}
      <polygon points={dataPoly} fill="var(--purple)" fillOpacity={0.15} stroke="var(--purple)" strokeWidth="1.8" strokeLinejoin="round" />
      {ids.map((id, i) => {
        const p = pointAt(i, (avgs[i] / 5) * R)
        return (
          <circle key={id} cx={p.x} cy={p.y} r={3.5} fill="var(--purple)" stroke="var(--surface)" strokeWidth={1.5}>
            <title>{`${COMP_FULL[id]}: ${avgs[i].toFixed(1)}`}</title>
          </circle>
        )
      })}
      {ids.map((id, i) => {
        const p = pointAt(i, R + 16)
        const cos = Math.cos(angleAt(i))
        const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end'
        return (
          <text key={id} x={p.x} y={p.y + 3} textAnchor={anchor} fontSize="10" fill="var(--txt2)">
            <title>{`${COMP_FULL[id]}: ${avgs[i].toFixed(1)}`}</title>
            {COMP_SHORT[id]}
          </text>
        )
      })}
    </svg>
  )
}
