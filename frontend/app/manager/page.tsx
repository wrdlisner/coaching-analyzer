'use client'

import { useState, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Step = 'upload' | 'processing' | 'done' | 'error'

export default function ManagerPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (selected: File | null) => {
    if (!selected) return
    const ext = selected.name.split('.').pop()?.toLowerCase()
    if (!['mp3', 'mp4', 'm4a'].includes(ext || '')) {
      setError('mp3、mp4、m4aファイルのみ対応しています')
      return
    }
    if (selected.size > 500 * 1024 * 1024) {
      setError('ファイルサイズは500MB以下にしてください')
      return
    }
    setError('')
    setFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileChange(e.dataTransfer.files[0])
  }

  const handleAnalyze = async () => {
    if (!file) return
    setStep('processing')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/manager/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
          const json = await res.json()
          detail = json.detail || detail
        } catch { /* ignore */ }
        throw new Error(detail)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'manager_1on1_report.pdf'
      a.click()
      URL.revokeObjectURL(url)

      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '分析に失敗しました')
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            管理職1on1 分析ツール
          </h1>
          <p className="text-sm text-gray-500">
            ICFコアコンピテンシー（2025年版）を管理職1on1に応用した評価軸
          </p>
        </div>

        {/* アップロード画面 */}
        {(step === 'upload' || step === 'error') && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">

            {/* ドロップゾーン */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.mp4,.m4a"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">✓</div>
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline"
                  >
                    ファイルを変更
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2 text-gray-300">+</div>
                  <p className="text-gray-600 font-medium">ここにファイルをドロップ</p>
                  <p className="text-sm text-gray-400 mt-1">またはクリックして選択</p>
                  <p className="text-xs text-gray-400 mt-2">mp3 / mp4 / m4a・最大500MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* 注意事項 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 space-y-1">
              <p className="font-medium">ご利用にあたって</p>
              <p>・本ツールはAI（Claude）による自動分析です。ICF公式の評価ではありません。</p>
              <p>・音声データは分析完了後に即時削除されます。</p>
              <p>・1on1の録音・分析利用についてご参加者の同意を事前に得てください。</p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file}
              className={`w-full py-3 rounded-xl font-medium text-white transition-colors ${
                file
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              分析を開始する
            </button>
          </div>
        )}

        {/* 処理中 */}
        {step === 'processing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-lg">分析中...</p>
              <p className="text-sm text-gray-500 mt-2">
                文字起こし＋AI分析に数分かかります
              </p>
              <p className="text-xs text-gray-400 mt-1">
                このページを閉じないでください
              </p>
            </div>
            <div className="space-y-2 text-left">
              {[
                '音声変換（mp4→mp3）',
                '文字起こし（AssemblyAI）',
                'AI分析・レポート生成（Claude）',
              ].map((label, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 完了 */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center space-y-6">
            <div className="text-5xl">✅</div>
            <div>
              <p className="font-bold text-gray-900 text-xl">分析が完了しました</p>
              <p className="text-sm text-gray-500 mt-2">
                PDFレポートのダウンロードが始まります
              </p>
            </div>
            <button
              onClick={() => { setFile(null); setStep('upload') }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              別のファイルを分析する
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
