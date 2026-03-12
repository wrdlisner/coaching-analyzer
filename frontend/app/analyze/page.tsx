'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth, analyze, getToken } from '@/lib/api'

type Step = 1 | 2 | 3
type SessionType = 'initial' | 'follow_up'

interface PhaseInfo {
  label: string
  range: [number, number]
}

const PHASES: PhaseInfo[] = [
  { label: '音声変換中（mp4→mp3）', range: [0, 10] },
  { label: '文字起こし中（AssemblyAI）', range: [10, 70] },
  { label: 'ICF分析・レポート生成中', range: [70, 100] },
]

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'まもなく完了'
  const m = Math.ceil(seconds / 60)
  return m <= 1 ? '残り約1分' : `残り約${m}分`
}

export default function AnalyzePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [credits, setCredits] = useState<number>(0)
  const [consents, setConsents] = useState([false, false, false, false])
  const [file, setFile] = useState<File | null>(null)
  const [sessionType, setSessionType] = useState<SessionType>('initial')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  // Progress state
  const [progress, setProgress] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const allConsentsChecked = consents.every(Boolean)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!getToken()) {
      router.push('/login')
      return
    }
    auth.getMe().then((u) => setCredits(u.credits)).catch(() => router.push('/login'))
  }, [router])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (progressInterval.current) clearInterval(progressInterval.current) }
  }, [])

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

  const startProgressSimulation = (selectedFile: File) => {
    if (progressInterval.current) clearInterval(progressInterval.current)

    const fileSizeMb = selectedFile.size / (1024 * 1024)
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    const needsConversion = ext === 'mp4' || ext === 'm4a'

    // Estimated durations (seconds)
    const conversionSec = needsConversion ? Math.max(5, fileSizeMb * 0.5) : 3
    const transcriptionSec = Math.max(30, fileSizeMb * 28)
    const analysisSec = 90
    const totalSec = conversionSec + transcriptionSec + analysisSec

    // Phase breakpoints in seconds
    const phaseEnds = [conversionSec, conversionSec + transcriptionSec, totalSec]

    let elapsed = 0
    const tick = 500 // ms

    setProgress(0)
    setPhaseIndex(0)
    setRemainingSeconds(Math.round(totalSec))

    progressInterval.current = setInterval(() => {
      elapsed += tick / 1000

      // Determine current phase
      let currentPhase = 0
      for (let i = 0; i < phaseEnds.length; i++) {
        if (elapsed < phaseEnds[i]) { currentPhase = i; break }
        currentPhase = i
      }
      setPhaseIndex(currentPhase)

      // Calculate progress within phase
      const phaseStart = currentPhase === 0 ? 0 : phaseEnds[currentPhase - 1]
      const phaseEnd = phaseEnds[currentPhase]
      const phaseRange = PHASES[currentPhase].range
      const phaseProgress =
        Math.min((elapsed - phaseStart) / (phaseEnd - phaseStart), 0.97) *
        (phaseRange[1] - phaseRange[0]) +
        phaseRange[0]

      // Cap at 95% until actual completion
      setProgress(Math.min(phaseProgress, 95))
      setRemainingSeconds(Math.max(0, Math.round(totalSec - elapsed)))
    }, tick)
  }

  const handleStartAnalysis = async () => {
    if (!file) return
    setStep(3)
    setError('')
    startProgressSimulation(file)

    try {
      const result = await analyze.submitAnalysis(file, sessionType)
      if (progressInterval.current) clearInterval(progressInterval.current)
      setProgress(100)
      setTimeout(() => router.push(`/report/${result.session_id}`), 400)
    } catch (err: unknown) {
      if (progressInterval.current) clearInterval(progressInterval.current)
      const message = err instanceof Error ? err.message : '分析に失敗しました'
      setError(message)
      setStep(2)
      setProgress(0)
    }
  }

  const disclaimerItems = [
    '本ツールのセッション分析はAI（Claude）が自動的に行います',
    '分析結果はICF公式の評価ではなく、参考情報です',
    '分析データはサービス改善のために利用される場合があります（データには個人が特定される情報は含まれません）',
    '分析に1クレジット消費することに同意します（現在: ' + credits + ' クレジット）',
  ]

  const currentPhase = PHASES[phaseIndex]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Back button */}
        {step !== 3 && (
          <div className="mb-4">
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← ダッシュボードに戻る
            </a>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === n
                    ? 'bg-blue-600 text-white'
                    : step > n
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > n ? '✓' : n}
              </div>
              <span
                className={`text-sm hidden sm:block ${
                  step === n ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                {n === 1 ? '確認事項' : n === 2 ? 'ファイル選択' : '分析中'}
              </span>
              {n < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {/* Step 1: Consent */}
        {step === 1 && (
          <div className="card">
            <h1 className="text-xl font-bold text-gray-900 mb-2">確認事項</h1>
            <p className="text-sm text-gray-500 mb-6">
              以下の内容をご確認のうえ、すべてにチェックしてください
            </p>
            <div className="space-y-4">
              {disclaimerItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300"
                    checked={consents[i]}
                    onChange={(e) => {
                      const next = [...consents]
                      next[i] = e.target.checked
                      setConsents(next)
                    }}
                  />
                  <span className="text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!allConsentsChecked || credits < 1}
              className="btn-primary w-full mt-6 py-3"
            >
              {credits < 1 ? 'クレジット不足' : '次へ：ファイル選択'}
            </button>
            {credits < 1 && (
              <p className="text-center text-xs text-red-500 mt-2">
                クレジットが不足しています。フィードバックやXシェアで獲得できます。
              </p>
            )}
          </div>
        )}

        {/* Step 2: Session type + File upload */}
        {step === 2 && (
          <div className="card space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">セッション情報・ファイル選択</h1>
              <p className="text-sm text-gray-500">mp3 / mp4 / m4a 形式、最大500MB</p>
            </div>

            {/* Session type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">セッション種別</p>
              <div className="flex gap-3">
                {[
                  { value: 'initial', label: '初回セッション' },
                  { value: 'follow_up', label: '継続セッション（2回目以降）' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex items-center gap-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                      sessionType === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sessionType"
                      value={opt.value}
                      checked={sessionType === opt.value}
                      onChange={() => setSessionType(opt.value as SessionType)}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
              {sessionType === 'follow_up' && (
                <p className="text-xs text-gray-500 mt-2">
                  ※ 契約・守秘義務説明など初回固有の評価項目は「継続セッションのため評価対象外」と表示されます
                </p>
              )}
            </div>

            {/* File drop zone */}
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
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
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
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                戻る
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={!file}
                className="btn-primary flex-1 py-3"
              >
                分析を開始する
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing with progress */}
        {step === 3 && (
          <div className="card py-10 space-y-6">
            {/* Overall progress */}
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>全体の進捗</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">
                {progress < 95 ? formatRemaining(remainingSeconds) : 'まもなく完了...'}
              </p>
            </div>

            {/* Phase steps */}
            <div className="space-y-3">
              {PHASES.map((phase, i) => {
                const [rangeStart, rangeEnd] = phase.range
                const isDone = progress >= rangeEnd
                const isActive = progress >= rangeStart && progress < rangeEnd
                const phaseProgress = isDone
                  ? 100
                  : isActive
                  ? Math.round(((progress - rangeStart) / (rangeEnd - rangeStart)) * 100)
                  : 0

                return (
                  <div key={i} className={`rounded-lg border px-4 py-3 transition-colors ${
                    isDone ? 'border-green-200 bg-green-50' :
                    isActive ? 'border-blue-200 bg-blue-50' :
                    'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-green-500 text-white' :
                          isActive ? 'bg-blue-600 text-white' :
                          'bg-gray-200 text-gray-400'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </span>
                        <span className={`text-sm font-medium ${
                          isDone ? 'text-green-700' :
                          isActive ? 'text-blue-700' :
                          'text-gray-400'
                        }`}>
                          {phase.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {rangeStart}〜{rangeEnd}%
                      </span>
                    </div>
                    {isActive && (
                      <div className="mt-2">
                        <div className="w-full bg-blue-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${phaseProgress}%` }}
                          />
                        </div>
                        {i === 2 && (
                          <p className="text-xs text-blue-600 mt-1">残り時間の目安：約1〜2分</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Spinner */}
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              <span>分析中... このページを閉じないでください</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              文字起こし＋AI分析には数分かかります。ブラウザを閉じると分析が中断されます。
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
