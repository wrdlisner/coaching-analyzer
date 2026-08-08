'use client'

import { useEffect, useState } from 'react'
import { insights, reports, SemiannualReport } from '@/lib/api'

function periodLabelJa(period: string): string {
  // '2026-H1' → '2026年上半期'
  const [year, half] = period.split('-')
  return `${year}年${half === 'H1' ? '上半期' : '下半期'}`
}

// 半期成長レポート + 成長記録PDF出力（プロフィールの2カラム部分）
export default function GrowthReportsCard({ sessionCount }: { sessionCount: number }) {
  const [reportList, setReportList] = useState<SemiannualReport[]>([])
  const [generatablePeriod, setGeneratablePeriod] = useState<string | null>(null)
  const [openPeriod, setOpenPeriod] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    insights.listSemiannual()
      .then(res => { setReportList(res.reports); setGeneratablePeriod(res.generatable_period) })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!generatablePeriod || generating) return
    setGenerating(true); setError('')
    try {
      const report = await insights.generateSemiannual(generatablePeriod)
      setReportList(prev => [report, ...prev.filter(r => r.period_label !== report.period_label)])
      setGeneratablePeriod(null)
      setOpenPeriod(report.period_label)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'レポートの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (pdfLoading) return
    setPdfLoading(true); setError('')
    try {
      const blob = await reports.downloadGrowthPdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `growth_report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PDFのダウンロードに失敗しました')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="two-col" style={{ marginBottom: '0.75rem' }}>
      {/* 半期成長レポート */}
      <div className="ds-card" style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 8px' }}>📖 半期成長レポート</h2>
        <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '0 0 12px' }}>
          半年ごとの分析の蓄積から、AIが読み物形式の成長レポートを作成します
        </p>
        {generatablePeriod && (
          <button onClick={handleGenerate} disabled={generating} className="btn-create" style={{ width: '100%', marginBottom: 10, opacity: generating ? 0.6 : 1 }}>
            {generating ? '生成中...（20秒ほどかかります）' : `${periodLabelJa(generatablePeriod)}レポートを作成する`}
          </button>
        )}
        {reportList.length === 0 && !generatablePeriod && (
          <p style={{ fontSize: 12, color: 'var(--txt3)', margin: 0 }}>
            対象半期に3回以上の分析があると、半期終了後に作成できるようになります
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reportList.map(r => (
            <div key={r.period_label} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--rs)', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenPeriod(openPeriod === r.period_label ? null : r.period_label)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: 'none', padding: '10px 12px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{periodLabelJa(r.period_label)}</span>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{openPeriod === r.period_label ? '閉じる ▴' : '読む ▾'}</span>
              </button>
              {openPeriod === r.period_label && (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', margin: '0 0 4px' }}>この半期のハイライト</p>
                    <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, lineHeight: 1.7 }}>{r.payload.highlights}</p>
                  </div>
                  {r.payload.improved_competencies.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', margin: '0 0 4px' }}>改善されたコンピテンシー</p>
                      {r.payload.improved_competencies.map(c => (
                        <p key={c.id} style={{ fontSize: 13, color: 'var(--txt)', margin: '0 0 4px', lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 600 }}>{c.name}：</span>{c.comment}
                        </p>
                      ))}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', margin: '0 0 4px' }}>継続課題</p>
                    <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0, lineHeight: 1.7 }}>{r.payload.ongoing_challenges}</p>
                  </div>
                  {r.payload.next_focus.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', margin: '0 0 4px' }}>次の半期の焦点候補</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {r.payload.next_focus.map((f, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.6 }}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 成長記録PDF出力 */}
      <div className="ds-card" style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 8px' }}>📄 成長記録PDF</h2>
        <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '0 0 12px' }}>
          コンピテンシー別の状況・AIコメント・スコア推移をまとめたPDFです。メンターコーチとの勉強会などにご活用ください
        </p>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading || sessionCount === 0}
          className="btn-create"
          style={{ width: '100%', opacity: pdfLoading || sessionCount === 0 ? 0.6 : 1 }}
        >
          {pdfLoading ? '生成中...' : 'PDFをダウンロード'}
        </button>
        {sessionCount === 0 && (
          <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0 0' }}>分析を実行すると出力できます</p>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--coral)', margin: 0, gridColumn: '1 / -1' }}>{error}</p>}
    </div>
  )
}
