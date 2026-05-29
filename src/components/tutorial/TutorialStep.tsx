'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore }    from '@/stores/chartStore'
import type { TutorialStep as TStep } from '@/types'

/* ─── 상수 ────────────────────────────────────────────────── */
const PAD       = 6
const SCROLL_MS = 350

/* ─── 하이라이트 링 위치 타입 ─────────────────────────────── */
interface HighlightRect {
  top: number; left: number; width: number; height: number
}

/* ─── 대상 요소가 뷰포트 안에 있는지 확인 ─────────────────── */
function isInViewport(rect: DOMRect): boolean {
  return rect.bottom > 0 && rect.top < window.innerHeight &&
         rect.right > 0  && rect.left < window.innerWidth
}

function calcHighlight(step: TStep): HighlightRect | null {
  const el = document.querySelector(step.targetSelector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (!isInViewport(rect)) return null
  return {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  }
}

function scrollToTarget(step: TStep): boolean {
  const el = document.querySelector(step.targetSelector)
  if (!el) return false
  const vh   = window.innerHeight
  const rect = el.getBoundingClientRect()
  // 패널이 화면 하단 40%를 차지하므로 대상이 상단 55% 안에 들어오도록 스크롤
  const targetScrollY = window.scrollY + rect.top - vh * 0.25
  window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' })
  return true
}

/* ═══════════════════════════════════════════════════════════════
   컴포넌트
═══════════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const {
    currentStep, currentIndex, steps,
    stepDone, candleData, chosenJudgment,
    next, prev, skip, notifyJudgment, markStepDone,
  } = useTutorialStore()

  const { activeIndicators } = useChartStore()

  const [hl,          setHl]          = useState<HighlightRect | null>(null)
  const [showPanel,   setShowPanel]   = useState(false)
  // 액션이 필요한 단계 중 미완료 상태에서는 패널을 접어둠 (차트/버튼 클릭 방해 최소화)
  const [minimized,   setMinimized]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── indicator-toggle 감지 ─────────────────────────────── */
  useEffect(() => {
    if (!currentStep ||
        currentStep.actionRequired !== 'indicator-toggle' ||
        !currentStep.indicatorKey  ||
        stepDone) return

    if (activeIndicators.has(currentStep.indicatorKey as any)) {
      markStepDone()
    }
  }, [activeIndicators, currentStep, stepDone, markStepDone])

  /* ── 하이라이트 링 재계산 (스크롤·리사이즈 시) ────────────── */
  const recompute = useCallback(() => {
    if (!currentStep) { setHl(null); return }
    setHl(calcHighlight(currentStep))
  }, [currentStep])

  /* ── 단계 변경 ────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentStep) { setHl(null); setShowPanel(false); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowPanel(false); setHl(null)

    // 액션 대기 단계는 접힌 상태로 시작 (완료 시 자동 펼침)
    const needsAction =
      currentStep.actionRequired === 'candle-click' ||
      currentStep.actionRequired === 'indicator-toggle'
    setMinimized(needsAction)

    const hasEl = scrollToTarget(currentStep)
    timerRef.current = setTimeout(() => {
      recompute()
      setShowPanel(true)
    }, hasEl ? SCROLL_MS : 80)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── stepDone → 패널 자동 펼침 ────────────────────────────── */
  useEffect(() => {
    if (stepDone) setMinimized(false)
    recompute()
  }, [stepDone, recompute])

  /* ── 스크롤·리사이즈 → 하이라이트 재계산 ─────────────────── */
  useEffect(() => {
    const handler = () => recompute()
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
    }
  }, [recompute])

  if (!currentStep) return null
  const isLast = currentIndex === steps.length - 1

  const canAdvance =
    !currentStep.actionRequired ||
    currentStep.actionRequired === 'free' ||
    stepDone

  /* ────────────────────────────────────────────────────────
     BODY
  ──────────────────────────────────────────────────────── */
  const Body = () => (
    <div className="overflow-y-auto flex-1 px-5 pt-1 pb-2">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {steps.length}
            </span>
            <span className="text-[9px] text-gray-400">어떤 버튼도 안전해요 🙂</span>
          </div>
          <p className="font-bold text-gray-900 text-[15px] leading-snug">{currentStep.title}</p>
        </div>
        <button
          onClick={skip}
          className="text-gray-300 hover:text-gray-500 text-[11px] shrink-0 mt-1 transition-colors"
        >
          건너뛰기
        </button>
      </div>

      {/* 본문 */}
      <div className="text-[12.5px] text-gray-500 leading-relaxed whitespace-pre-line">
        {currentStep.body}
      </div>

      {/* 팁 목록 */}
      {currentStep.tips && currentStep.tips.length > 0 && (
        <ul className="mt-2.5 space-y-1 rounded-2xl bg-gray-50 p-3">
          {currentStep.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-[11.5px] text-gray-600 leading-relaxed">
              <span className="text-indigo-300 shrink-0 mt-px">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ── 미션 박스 (행동 대기 중) ─────────────────────────── */}
      {currentStep.mission && !stepDone && (
        <div className="mt-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">🎯 지금 해보세요</span>
          </div>
          <p className="text-[12px] text-indigo-700 leading-relaxed">{currentStep.mission}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] text-indigo-400">행동을 기다리는 중...</span>
          </div>
        </div>
      )}

      {/* ── 3지선다 판단 UI ──────────────────────────────────── */}
      {currentStep.actionRequired === 'judgment' && currentStep.judgment && (
        <div className="mt-2.5">
          {!stepDone ? (
            <>
              <p className="text-[12px] font-semibold text-gray-700 mb-2">
                {currentStep.judgment.question}
              </p>
              <div className="flex flex-col gap-1.5">
                {currentStep.judgment.choices.map(choice => (
                  <button
                    key={choice.value}
                    onClick={() => notifyJudgment(choice.value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200
                               hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100
                               transition-all text-left group"
                  >
                    <span className="text-lg">{choice.icon}</span>
                    <span className="text-[12px] font-medium text-gray-700 group-hover:text-indigo-700">
                      {choice.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">
                    {currentStep.judgment.choices.find(c => c.value === chosenJudgment)?.icon}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-500">내 선택</span>
                  <span className="text-[11px] text-indigo-600">
                    {currentStep.judgment.choices.find(c => c.value === chosenJudgment)?.label}
                  </span>
                </div>
                <p className="text-[12px] text-indigo-700 leading-relaxed">
                  {currentStep.judgment.choices.find(c => c.value === chosenJudgment)?.feedback}
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ── 캔들 OHLC 카드 ───────────────────────────────────── */}
      {stepDone && candleData && currentStep.actionRequired === 'candle-click' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 rounded-2xl bg-slate-50 border border-slate-200 p-3"
          >
            <p className="text-[10px] font-bold text-slate-500 mb-2">
              📊 클릭한 날 ({candleData.time})
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '시가', value: `$${candleData.open.toFixed(2)}`,  color: '' },
                { label: '고가', value: `$${candleData.high.toFixed(2)}`,  color: '#10b981' },
                { label: '저가', value: `$${candleData.low.toFixed(2)}`,   color: '#ef4444' },
                { label: '종가', value: `$${candleData.close.toFixed(2)}`, color: '' },
                {
                  label: '변동',
                  value: `${candleData.close >= candleData.open ? '+' : ''}${((candleData.close - candleData.open) / candleData.open * 100).toFixed(1)}%`,
                  color: candleData.close >= candleData.open ? '#10b981' : '#ef4444',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center bg-white rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-slate-400">{label}</span>
                  <span className="text-[11px] font-bold mt-0.5" style={color ? { color } : { color: '#374151' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── 완료 메시지 ─────────────────────────────────────── */}
      {stepDone && currentStep.completionMessage && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 rounded-2xl bg-green-50 border border-green-200 p-3 flex items-start gap-2"
          >
            <span className="text-green-500 text-sm shrink-0">✅</span>
            <p className="text-[12px] text-green-700 leading-relaxed">
              {currentStep.completionMessage}
            </p>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── 마지막 단계: 시뮬레이션 CTA ─────────────────────── */}
      {isLast && (
        <Link
          href="/simulate"
          onClick={skip}
          className="mt-3 flex items-center justify-center gap-2 w-full
                     py-2.5 rounded-2xl font-bold text-[13px] text-white
                     bg-gradient-to-r from-indigo-500 to-indigo-600
                     hover:from-indigo-400 hover:to-indigo-500
                     shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          🔮 시뮬레이션 도전하기
        </Link>
      )}
    </div>
  )

  /* ── 미니 패널 (접힌 상태 — 액션 대기 중) ──────────────────── */
  const MiniPanel = () => (
    <div className="px-5 py-3 flex items-center gap-3">
      {/* 스텝 + 타이틀 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
            {currentIndex + 1}/{steps.length}
          </span>
          <p className="text-[13px] font-bold text-gray-800 truncate">{currentStep.title}</p>
        </div>
        {currentStep.mission && (
          <p className="text-[11px] text-indigo-600 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            {currentStep.mission}
          </p>
        )}
      </div>
      {/* 펼치기 버튼 */}
      <button
        onClick={() => setMinimized(false)}
        className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-500
                   hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center gap-1"
      >
        <span>↑</span>
        <span>펼치기</span>
      </button>
    </div>
  )

  /* ── 네비게이션 ─────────────────────────────────────────── */
  const Nav = () => (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
      <ProgressDots total={steps.length} current={currentIndex} />
      <div className="flex gap-2 items-center">
        {/* 접기 버튼 (펼쳐진 상태에서만) */}
        {!minimized && (currentStep.actionRequired === 'candle-click' || currentStep.actionRequired === 'indicator-toggle') && !stepDone && (
          <button
            onClick={() => setMinimized(true)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] text-gray-400 border border-gray-200
                       hover:border-gray-300 hover:text-gray-600 transition"
          >
            ↓ 접기
          </button>
        )}
        {currentIndex > 0 && (
          <button
            onClick={prev}
            className="px-3 py-1.5 rounded-xl text-[12px] text-gray-400 border border-gray-200
                       hover:border-gray-300 hover:text-gray-600 transition"
          >
            이전
          </button>
        )}
        {!isLast && (
          <button
            onClick={canAdvance ? next : undefined}
            title={canAdvance ? '' : '위의 행동을 완료하면 다음으로 넘어갈 수 있어요'}
            className={
              canAdvance
                ? 'px-4 py-1.5 rounded-xl text-[12px] font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition shadow-sm'
                : 'px-4 py-1.5 rounded-xl text-[12px] font-semibold bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          >
            {canAdvance ? '다음 →' : '↑ 먼저 해보세요'}
          </button>
        )}
        {isLast && (
          <button
            onClick={skip}
            className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 transition"
          >
            차트 보기
          </button>
        )}
      </div>
    </div>
  )

  /* ── 렌더 ───────────────────────────────────────────────── */
  return (
    <AnimatePresence mode="wait">
      <>
        {/* 하이라이트 링 — z-45, pointer-events:none */}
        {hl && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position:      'fixed',
              top:           hl.top,
              left:          hl.left,
              width:         hl.width,
              height:        hl.height,
              zIndex:        45,
              pointerEvents: 'none',
              borderRadius:  12,
              boxShadow:     '0 0 0 2px #818cf8, 0 0 0 6px rgba(99,102,241,0.2)',
            }}
          />
        )}

        {/* ─── 고정 바텀 패널 — z-50 ─────────────────────────── */}
        {showPanel && (
          <motion.div
            key={`panel-${currentStep.id}-${stepDone}-${minimized}`}
            initial={{ y: minimized ? 20 : 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{   y: 60, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position:  'fixed',
              bottom:     0,
              left:      '50%',
              transform: 'translateX(-50%)',
              width:     '100%',
              maxWidth:   680,
              zIndex:     50,
              maxHeight:  minimized ? 'auto' : '52vh',
              display:   'flex',
              flexDirection: 'column',
            }}
            className="bg-white rounded-t-3xl shadow-[0_-8px_48px_rgba(0,0,0,0.18)]"
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-2.5 pb-0.5 flex-shrink-0">
              <div className="w-9 h-1 bg-gray-200 rounded-full" />
            </div>

            <AnimatePresence mode="wait">
              {minimized ? (
                <motion.div
                  key="mini"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MiniPanel />
                  <Nav />
                </motion.div>
              ) : (
                <motion.div
                  key="full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col overflow-hidden flex-1"
                  style={{ maxHeight: 'calc(52vh - 28px)' }}
                >
                  <Body />
                  <Nav />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </>
    </AnimatePresence>
  )
}
