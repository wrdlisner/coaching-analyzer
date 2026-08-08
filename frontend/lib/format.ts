// 表示用フォーマットユーティリティ（ダッシュボード・レポート共通）

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}分${s}秒`
}

// ---- 評価モード・エンジンバージョン ----
// メタデータ導入前の旧セッションは evaluation_mode / engine_version が null。
// 全表示箇所がこの正規化を通すことで「標準 · v2.0」として一貫して扱う。

export const EVAL_MODE_LABELS: Record<string, string> = {
  standard: '標準',
  acc: 'ACC',
}

export interface EngineInfo {
  mode: string       // 'standard' | 'acc'
  version: string    // '2.0' | '2.1' ...
  label: string      // '標準 · v2.0' / 'ACC · v2.1'
}

export function normalizeEngine(s: { evaluation_mode?: string | null; engine_version?: string | null }): EngineInfo {
  const mode = s.evaluation_mode || 'standard'
  const version = s.engine_version || '2.0'
  return { mode, version, label: engineBadgeLabel(mode, version) }
}

export function engineBadgeLabel(mode: string, version: string): string {
  return `${EVAL_MODE_LABELS[mode] || mode} · v${version}`
}
