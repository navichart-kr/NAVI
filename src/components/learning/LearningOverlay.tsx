'use client'

/**
 * LearningOverlay — 캔들 패턴 & 거래량 학습 전체 UI
 *
 * ① 패턴/주제 선택 모달 (candle-select / volume-select)
 * ② 학습 바텀시트 (candle-active / volume-active)
 *    - Dim 오버레이 + 바텀시트 (35~45vh)
 *    - 단계 설명 → 예측 → 결과 공개
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useLearningStore,
  CANDLE_LESSONS,
  VOLUME_LESSONS,
  type PatternType,
  type VolumeTopicType,
} from '@/stores/learningStore'
import { useChartStore } from '@/stores/chartStore'
import {
  findBestCandlePattern,
  findVolumePattern,
} from '@/lib/patternDetector'
import { useMobile } from '@/hooks/useMobile'
import { clsx } from 'clsx'

/* ── 예측 선택지 ──────────────────────────────────────── */
const PREDICTION_CHOICES = [
  { value: 'up',       icon: '↑', label: '상승',  color: 'text-[#34D399] border-[#34D399]/40 bg-[#34D399]/[0.06]' },
  { value: 'down',     icon: '↓', label: '하락',  color: 'text-[#F87171] border-[#F87171]/40 bg-[#F87171]/[0.06]' },
  { value: 'sideways', icon: '→', label: '횡보',  color: 'text-amber-400 border-amber-400/40 bg-amber-400/[0.06]'  },
] as const

/* ── 방향 라벨 ──────────────────────────────────────────── */
function dirLabel(d: 'up' | 'down' | 'sideways') {
  return d === 'up' ? '상승했어요 ↑' : d === 'down' ? '하락했어요 ↓' : '횡보했어요 →'
}
function dirColor(d: 'up' | 'down' | 'sideways') {
  return d === 'up'   ? 'text-[#34D399]'
       : d === 'down' ? 'text-[#F87171]'
       : 'text-amber-400'
}

/* ════ 메인 컴포넌트 ════════════════════════════════════ */
export function LearningOverlay() {
  const {
    mode, patternType, volumeTopic, stepIndex,
    prediction, showResult, patternLocation,
    openCandleSelect, openVolumeSelect,
    startCandleLesson, startVolumeLesson,
    nextStep, prevStep, submitPrediction, revealResult, close,
  } = useLearningStore()
  const { candleData } = useChartStore()
  const isMobile = useMobile()

  const [searching, setSearching] = useState(false)

  // ── 패턴 선택 후 탐지 ────────────────────────────────────
  const handleCandleSelect = useCallback(async (type: PatternType) => {
    setSearching(true)
    // 약간 딜레이 (UI 반응감)
    await new Promise(r => setTimeout(r, 120))
    const loc = findBestCandlePattern(candleData, type)
    setSearching(false)
    if (!loc) {
      alert('이 패턴을 현재 데이터에서 찾을 수 없어요. 다른 패턴을 선택해보세요.')
      return
    }
    startCandleLesson(type, loc)
  }, [candleData, startCandleLesson])

  const handleVolumeSelect = useCallback(async (type: VolumeTopicType) => {
    setSearching(true)
    await new Promise(r => setTimeout(r, 120))
    const loc = findVolumePattern(candleData, type)
    setSearching(false)
    if (!loc) {
      alert('거래량 데이터를 찾을 수 없어요.')
      return
    }
    startVolumeLesson(type, loc)
  }, [candleData, startVolumeLesson])

  // ── 현재 레슨 정보 ────────────────────────────────────────
  const lesson = mode === 'candle-active' && patternType
    ? CANDLE_LESSONS[patternType]
    : mode === 'volume-active' && volumeTopic
    ? VOLUME_LESSONS[volumeTopic]
    : null

  const steps      = lesson?.steps ?? []
  const currentStep = steps[stepIndex] ?? null
  const totalSteps  = steps.length
  const isLastStep  = stepIndex === totalSteps - 1
  const outcome     = patternLocation?.outcome ?? null

  const isPredictionStep = currentStep?.isPrediction === true
  const canNext = !isPredictionStep || prediction !== null

  /* ════ 렌더 ════════════════════════════════════════════════ */
  return (
    <AnimatePresence>

      {/* ── 패턴 선택 모달 ──────────────────────────────── */}
      {(mode === 'candle-select' || mode === 'volume-select') && (
        <>
          {/* 백드롭 */}
          <motion.div
            key="select-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 z-[44]"
            onClick={close}
          />

          {/* 모달 패널 */}
          <motion.div
            key="select-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[50]
                       bg-navi-surface rounded-t-2xl overflow-hidden
                       sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2
                       sm:-translate-x-1/2 sm:-translate-y-1/2
                       sm:rounded-2xl sm:w-full sm:max-w-md"
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-8 h-[3px] rounded-full bg-navi-border2" />
            </div>

            <div className="px-5 pt-3 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-navi-text">
                  {mode === 'candle-select' ? '캔들 패턴 선택' : '거래량 주제 선택'}
                </h2>
                <button
                  onClick={close}
                  className="w-7 h-7 flex items-center justify-center rounded-full
                             text-navi-muted hover:text-navi-text bg-navi-surface2
                             text-[12px] transition-colors"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-navi-muted mb-4">
                {mode === 'candle-select'
                  ? '실제 차트 데이터에서 해당 패턴이 발생한 구간을 자동으로 찾아줘요.'
                  : '실제 거래량 데이터에서 가장 설명하기 좋은 구간을 자동으로 찾아줘요.'}
              </p>

              {searching && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <div className="w-4 h-4 border-2 border-navi-action border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] text-navi-muted">패턴 탐색 중...</span>
                </div>
              )}

              {!searching && mode === 'candle-select' && (
                <div className="space-y-2">
                  {(Object.entries(CANDLE_LESSONS) as [PatternType, typeof CANDLE_LESSONS[PatternType]][])
                    .map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => handleCandleSelect(type)}
                        className="w-full flex items-center gap-3 px-4 py-3
                                   bg-navi-surface2 border border-navi-border rounded-xl
                                   hover:border-navi-action/40 hover:bg-navi-action/[0.04]
                                   transition-all active:scale-[0.98] text-left"
                      >
                        <span className="text-[22px] leading-none shrink-0">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-navi-text">{info.name}</p>
                          <p className="text-[11px] text-navi-muted mt-0.5">{info.desc}</p>
                        </div>
                        <span className="text-navi-muted text-[14px] shrink-0">›</span>
                      </button>
                    ))}
                </div>
              )}

              {!searching && mode === 'volume-select' && (
                <div className="space-y-2">
                  {(Object.entries(VOLUME_LESSONS) as [VolumeTopicType, typeof VOLUME_LESSONS[VolumeTopicType]][])
                    .map(([type, info]) => (
                      <button
                        key={type}
                        onClick={() => handleVolumeSelect(type)}
                        className="w-full flex items-center gap-3 px-4 py-3
                                   bg-navi-surface2 border border-navi-border rounded-xl
                                   hover:border-navi-action/40 hover:bg-navi-action/[0.04]
                                   transition-all active:scale-[0.98] text-left"
                      >
                        <span className="text-[22px] leading-none shrink-0">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-navi-text">{info.name}</p>
                          <p className="text-[11px] text-navi-muted mt-0.5">{info.desc}</p>
                        </div>
                        <span className="text-navi-muted text-[14px] shrink-0">›</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* ── 학습 활성 상태: Dim + 바텀시트 ─────────────────── */}
      {(mode === 'candle-active' || mode === 'volume-active') && lesson && currentStep && (
        <>
          {/* Dim 오버레이 (차트 위는 보이도록 pointer-events 없음) */}
          <motion.div
            key="learn-dim"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 z-[44] pointer-events-none"
          />

          {/* 바텀시트 */}
          <motion.div
            key="learn-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            style={{ maxHeight: isMobile ? '45vh' : '42vh' }}
            className="fixed bottom-0 left-0 right-0 z-[50]
                       bg-navi-surface border-t border-navi-border
                       rounded-t-2xl flex flex-col overflow-hidden"
          >
            {/* 드래그 핸들 */}
            <div className="flex-shrink-0 flex justify-center pt-2.5 pb-0.5">
              <div className="w-8 h-[3px] rounded-full bg-navi-border2" />
            </div>

            {/* 헤더: 패턴 이름 + 진행 + 닫기 */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-1 pb-2">
              {/* 프로그레스 바 */}
              <div className="flex-1 flex gap-[3px]">
                {steps.map((_, i) => (
                  <div key={i} className={clsx(
                    'h-[3px] flex-1 rounded-full transition-all duration-300',
                    i < stepIndex  ? 'bg-navi-action/70' :
                    i === stepIndex ? 'bg-navi-action'    : 'bg-navi-border2'
                  )} />
                ))}
              </div>
              <span className="text-[10px] text-navi-muted tabular-nums shrink-0">
                {stepIndex + 1}/{totalSteps}
              </span>
              <button
                onClick={close}
                className="w-6 h-6 flex items-center justify-center rounded-full
                           bg-navi-surface2 text-navi-muted hover:text-navi-text
                           text-[11px] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-4 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${stepIndex}-${String(showResult)}-${String(prediction)}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  {/* ── 결과 공개 화면 ───────────────────────────── */}
                  {showResult && outcome ? (
                    <ResultContent
                      prediction={prediction}
                      outcome={outcome}
                      lesson={lesson}
                      isMobile={isMobile}
                    />
                  ) : isPredictionStep ? (
                    /* ── 예측 선택 ───────────────────────────────── */
                    <PredictionContent
                      text={currentStep.text}
                      prediction={prediction}
                      onSubmit={submitPrediction}
                      isMobile={isMobile}
                    />
                  ) : (
                    /* ── 일반 설명 단계 ──────────────────────────── */
                    <StepContent step={currentStep} isMobile={isMobile} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 네비게이션 */}
            <div className="flex-shrink-0 flex items-center justify-between
                            px-4 py-2.5 border-t border-navi-border/40">
              <button
                onClick={stepIndex > 0 ? prevStep : close}
                className="text-[11px] text-navi-muted hover:text-navi-text transition-colors py-1"
              >
                {stepIndex > 0 ? '← 이전' : '닫기'}
              </button>

              {/* 다음 / 결과 보기 / 완료 버튼 */}
              {showResult ? (
                <button
                  onClick={close}
                  className="px-5 h-9 rounded-xl text-[12px] font-semibold
                             bg-navi-action text-white hover:bg-navi-action-hover
                             transition active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.3)]"
                >
                  완료
                </button>
              ) : isPredictionStep && prediction !== null ? (
                <button
                  onClick={revealResult}
                  className="px-5 h-9 rounded-xl text-[12px] font-semibold
                             bg-amber-500 text-white hover:bg-amber-600
                             transition active:scale-95"
                >
                  결과 확인 →
                </button>
              ) : (
                <button
                  onClick={canNext ? nextStep : undefined}
                  disabled={!canNext}
                  className={clsx(
                    'px-5 h-9 rounded-xl text-[12px] font-semibold transition-all',
                    canNext
                      ? 'bg-navi-action text-white hover:bg-navi-action-hover active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.3)]'
                      : 'bg-navi-surface3 text-navi-disabled cursor-not-allowed'
                  )}
                >
                  {canNext ? '다음 →' : '선택해주세요'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── 하위 컴포넌트들 ─────────────────────────────────── */

interface StepContentProps {
  step: { text: string; subtext?: string }
  isMobile: boolean
}
function StepContent({ step, isMobile }: StepContentProps) {
  return (
    <div className="space-y-2 py-2">
      <p className={clsx('font-bold text-navi-text leading-snug',
        isMobile ? 'text-[14px]' : 'text-[15px]')}>
        {step.text}
      </p>
      {step.subtext && (
        <p className="text-[12px] text-navi-secondary leading-relaxed">{step.subtext}</p>
      )}
    </div>
  )
}

interface PredictionContentProps {
  text: string
  prediction: string | null
  onSubmit: (v: 'up' | 'down' | 'sideways') => void
  isMobile: boolean
}
function PredictionContent({ text, prediction, onSubmit, isMobile }: PredictionContentProps) {
  return (
    <div className="space-y-3 py-2">
      <p className={clsx('font-bold text-navi-text leading-snug',
        isMobile ? 'text-[14px]' : 'text-[15px]')}>
        {text}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PREDICTION_CHOICES.map(ch => (
          <button
            key={ch.value}
            onClick={() => onSubmit(ch.value)}
            className={clsx(
              'flex flex-col items-center py-3 rounded-xl border-2 font-semibold transition-all active:scale-95',
              prediction === ch.value
                ? ch.color + ' scale-[1.02]'
                : 'border-navi-border2 text-navi-text hover:border-navi-action/40'
            )}
          >
            <span className="text-[20px] font-black leading-none">{ch.icon}</span>
            <span className="text-[12px] mt-1">{ch.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface ResultContentProps {
  prediction: string | null
  outcome: 'up' | 'down' | 'sideways'
  lesson: { name: string }
  isMobile: boolean
}
function ResultContent({ prediction, outcome, lesson, isMobile }: ResultContentProps) {
  const isCorrect = prediction === outcome
  const predLabel = PREDICTION_CHOICES.find(c => c.value === prediction)?.label ?? '–'

  return (
    <div className="space-y-3 py-2">
      <p className={clsx('font-bold text-navi-text', isMobile ? 'text-[14px]' : 'text-[15px]')}>
        결과 확인
      </p>

      {/* 결과 박스 */}
      <div className={clsx(
        'rounded-xl p-3.5 border',
        isCorrect
          ? 'bg-[#34D399]/[0.07] border-[#34D399]/25'
          : 'bg-navi-surface2 border-navi-border'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[18px]">{isCorrect ? '✅' : '🔍'}</span>
          <span className="text-[13px] font-bold text-navi-text">
            {isCorrect ? '정확해요!' : '아쉽지만 다음엔 맞출 수 있어요'}
          </span>
        </div>
        <p className="text-[12px] text-navi-secondary">
          내 예측: <span className="font-semibold text-navi-text">{predLabel}</span>
          {' '}/&nbsp;실제: <span className={clsx('font-bold', dirColor(outcome))}>{dirLabel(outcome)}</span>
        </p>
      </div>

      <p className="text-[12px] text-navi-secondary leading-relaxed">
        차트의 노란 점{' '}(●) 이후에 나타난 화살표가 실제 방향이에요.
        패턴을 반복해서 보면 눈에 익게 돼요!
      </p>
    </div>
  )
}
