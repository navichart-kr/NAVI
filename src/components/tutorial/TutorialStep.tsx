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
const SCROLL_MS = 360

/* ─── 패널 모드 ────────────────────────────────────────────── */
// MINI      : 지표 토글 대기 중 — 버튼 클릭을 방해하지 않는 64px 미니 바
// JUDGMENT  : 판단 단계 — 차트/서브차트를 가리지 않는 컴팩트 카드
// READING   : 캔들 클릭·자유 단계 — 내용이 있는 중간 크기 패널
// FEEDBACK  : 행동 완료 후 — 피드백 표시 컴팩트 패널
type PanelMode = 'mini' | 'judgment' | 'reading' | 'feedback'

function getMode(step: TStep, done: boolean): PanelMode {
  if (done) return 'feedback'
  if (step.actionRequired === 'indicator-toggle') return 'mini'
  if (step.actionRequired === 'judgment')         return 'judgment'
  return 'reading'
}

/* ─── 패널 고정 높이 (모든 모드 동일) ──────────────────────── */
const PANEL_H = 240

/* ─── 하이라이트 링 타입 ────────────────────────────────────── */
interface HighlightRect { top: number; left: number; width: number; height: number }

function calcHighlight(el: Element): HighlightRect {
  const r = el.getBoundingClientRect()
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

/**
 * 패널이 가리지 않도록 대상 요소가 화면에 완전히 들어오게 스크롤
 * panelHeight: 현재 패널이 차지할 하단 높이
 */
function smartScroll(step: TStep, panelHeight: number) {
  // 판단 단계: 서브차트 하단을 패널 위로 올림
  const subId =
    step.id === 'rsi-judgment'  ? 'rsi-chart'  :
    step.id === 'macd-judgment' ? 'macd-chart' : null

  const targetEl = subId
    ? document.getElementById(subId)
    : document.querySelector(step.targetSelector)

  if (!targetEl) return

  const rect = targetEl.getBoundingClientRect()
  const vh   = window.innerHeight
  // 패널 위 여유 공간에서 대상 요소의 하단이 들어오도록
  const safeBottom = vh - panelHeight - 16
  const safeTop    = 64  // 헤더 아래

  if (rect.bottom > safeBottom) {
    // 스크롤 다운 필요
    window.scrollBy({ top: rect.bottom - safeBottom, behavior: 'smooth' })
  } else if (rect.top < safeTop) {
    // 스크롤 업 필요
    window.scrollBy({ top: rect.top - safeTop, behavior: 'smooth' })
  }
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

  const [hl,        setHl]        = useState<HighlightRect | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mode = currentStep ? getMode(currentStep, stepDone) : 'reading'
  const ph   = PANEL_H

  /* ── indicator-toggle 감지 ─────────────────────────────── */
  useEffect(() => {
    if (!currentStep ||
        currentStep.actionRequired !== 'indicator-toggle' ||
        !currentStep.indicatorKey  ||
        stepDone) return
    if (activeIndicators.has(currentStep.indicatorKey as any)) markStepDone()
  }, [activeIndicators, currentStep, stepDone, markStepDone])

  /* ── 하이라이트 재계산 ──────────────────────────────────── */
  const recompute = useCallback(() => {
    if (!currentStep) { setHl(null); return }
    const el = document.querySelector(currentStep.targetSelector)
    if (!el) { setHl(null); return }
    const rect = el.getBoundingClientRect()
    // 뷰포트 밖이면 숨김
    if (rect.bottom < 0 || rect.top > window.innerHeight) { setHl(null); return }
    setHl(calcHighlight(el))
  }, [currentStep])

  /* ── 단계 변경 ────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentStep) { setHl(null); setShowPanel(false); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowPanel(false); setHl(null)

    const curMode = getMode(currentStep, false)
    const curPh   = PANEL_H

    smartScroll(currentStep, PANEL_H)

    timerRef.current = setTimeout(() => {
      recompute()
      setShowPanel(true)
    }, SCROLL_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── stepDone → 재계산 ─────────────────────────────────── */
  useEffect(() => { recompute() }, [stepDone, recompute])

  /* ── 스크롤·리사이즈 → 하이라이트 재계산 ──────────────── */
  useEffect(() => {
    const h = () => recompute()
    window.addEventListener('scroll', h, { passive: true })
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h); window.removeEventListener('resize', h) }
  }, [recompute])

  if (!currentStep) return null
  const isLast   = currentIndex === steps.length - 1
  const canAdvance =
    !currentStep.actionRequired ||
    currentStep.actionRequired === 'free' ||
    stepDone

  /* ── 공통 헤더 ──────────────────────────────────────────── */
  const StepBadge = () => (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
        {currentIndex + 1} / {steps.length}
      </span>
      <span className="text-[9px] text-gray-400">어떤 버튼도 안전해요 🙂</span>
    </div>
  )

  /* ── 네비게이션 ─────────────────────────────────────────── */
  const Nav = () => (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
      <ProgressDots total={steps.length} current={currentIndex} />
      <div className="flex gap-2 items-center">
        {currentIndex > 0 && (
          <button onClick={prev}
            className="px-3 py-1.5 rounded-xl text-[12px] text-gray-400 border border-gray-200
                       hover:border-gray-300 hover:text-gray-600 transition">
            이전
          </button>
        )}
        {!isLast && (
          <button
            onClick={canAdvance ? next : undefined}
            className={canAdvance
              ? 'px-4 py-1.5 rounded-xl text-[12px] font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition shadow-sm'
              : 'px-4 py-1.5 rounded-xl text-[12px] font-semibold bg-gray-100 text-gray-400 cursor-not-allowed'
            }>
            {canAdvance ? '다음 →' : '↑ 먼저 해보세요'}
          </button>
        )}
        {isLast && (
          <button onClick={skip}
            className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 transition">
            차트 보기
          </button>
        )}
      </div>
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     MINI 모드 — 지표 토글 대기 (버튼 클릭 방해 최소화)
  ════════════════════════════════════════════════════════════ */
  const MiniContent = () => (
    <div className="px-5 py-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <StepBadge />
        <p className="text-[13px] font-bold text-gray-800 mt-1 truncate">{currentStep.title}</p>
        {currentStep.mission && (
          <p className="text-[11px] text-indigo-600 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            {currentStep.mission}
          </p>
        )}
      </div>
      <button onClick={skip}
        className="shrink-0 text-[10px] text-gray-300 hover:text-gray-500 transition-colors">
        건너뛰기
      </button>
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     JUDGMENT 모드 — 차트·서브차트 위를 최대한 비움
  ════════════════════════════════════════════════════════════ */
  const JudgmentContent = () => (
    <div className="px-5 pt-3 pb-1 overflow-y-auto flex-1">
      <div className="flex items-start justify-between mb-2">
        <div>
          <StepBadge />
          <p className="text-[14px] font-bold text-gray-900 mt-1">{currentStep.title}</p>
        </div>
        <button onClick={skip} className="text-[11px] text-gray-300 hover:text-gray-500 shrink-0 mt-1">건너뛰기</button>
      </div>

      {currentStep.judgment && (
        <div>
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
                <span className="text-lg shrink-0">{choice.icon}</span>
                <span className="text-[12px] font-medium text-gray-700 group-hover:text-indigo-700">
                  {choice.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     READING 모드 — 캔들 클릭·자유 단계 (body 전체 표시)
  ════════════════════════════════════════════════════════════ */
  const ReadingContent = () => (
    <div className="px-5 pt-3 pb-1 overflow-y-auto flex-1">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <StepBadge />
          <p className="font-bold text-gray-900 text-[15px] leading-snug mt-1">{currentStep.title}</p>
        </div>
        <button onClick={skip}
          className="text-gray-300 hover:text-gray-500 text-[11px] shrink-0 mt-1 transition-colors">
          건너뛰기
        </button>
      </div>

      {/* 본문 */}
      <div className="text-[12.5px] text-gray-500 leading-relaxed whitespace-pre-line">
        {currentStep.body}
      </div>

      {/* 팁 */}
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

      {/* 미션 박스 */}
      {currentStep.mission && !stepDone && (
        <div className="mt-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
          <p className="text-[10px] font-bold text-indigo-500 mb-1">🎯 지금 해보세요</p>
          <p className="text-[12px] text-indigo-700 leading-relaxed">{currentStep.mission}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] text-indigo-400">행동을 기다리는 중...</span>
          </div>
        </div>
      )}

      {/* 마지막 단계 CTA */}
      {isLast && (
        <Link href="/simulate" onClick={skip}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl font-bold
                     text-[13px] text-white bg-gradient-to-r from-indigo-500 to-indigo-600
                     hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/20
                     transition-all active:scale-[0.98]">
          🔮 시뮬레이션 도전하기
        </Link>
      )}
    </div>
  )

  /* ════════════════════════════════════════════════════════════
     FEEDBACK 모드 — 행동 완료 후 피드백
  ════════════════════════════════════════════════════════════ */
  const FeedbackContent = () => (
    <div className="px-5 pt-3 pb-1 overflow-y-auto flex-1">
      <div className="flex items-start justify-between mb-2">
        <div>
          <StepBadge />
          <p className="text-[14px] font-bold text-gray-900 mt-1">{currentStep.title}</p>
        </div>
        <button onClick={skip} className="text-[11px] text-gray-300 hover:text-gray-500 shrink-0 mt-1">건너뛰기</button>
      </div>

      {/* 판단 피드백 */}
      {currentStep.actionRequired === 'judgment' && currentStep.judgment && chosenJudgment && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
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

      {/* 캔들 OHLC 카드 */}
      {candleData && currentStep.actionRequired === 'candle-click' && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-bold text-slate-500 mb-2">📊 클릭한 날 ({candleData.time})</p>
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
                  <span className="text-[11px] font-bold mt-0.5"
                    style={color ? { color } : { color: '#374151' }}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* 완료 메시지 */}
      {currentStep.completionMessage && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 rounded-2xl bg-green-50 border border-green-200 p-3 flex items-start gap-2">
            <span className="text-green-500 text-sm shrink-0">✅</span>
            <p className="text-[12px] text-green-700 leading-relaxed">{currentStep.completionMessage}</p>
          </motion.div>
        </AnimatePresence>
      )}

      {/* 마지막 단계 CTA */}
      {isLast && (
        <Link href="/simulate" onClick={skip}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl font-bold
                     text-[13px] text-white bg-gradient-to-r from-indigo-500 to-indigo-600
                     hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/20
                     transition-all active:scale-[0.98]">
          🔮 시뮬레이션 도전하기
        </Link>
      )}
    </div>
  )

  /* ── 렌더 ───────────────────────────────────────────────── */

  return (
    <AnimatePresence mode="wait">
      <>
        {/* 하이라이트 링 — z-45 */}
        {hl && (
          <motion.div
            key={`hl-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: hl.top, left: hl.left,
              width: hl.width, height: hl.height,
              zIndex: 45, pointerEvents: 'none', borderRadius: 12,
              boxShadow: '0 0 0 2px #818cf8, 0 0 0 6px rgba(99,102,241,0.2)',
            }}
          />
        )}

        {/* ── 하단 와이드 패널 (모든 모드 공통) ── */}
        {showPanel && (
          /* 고정 위치 래퍼: framer-motion transform 과 충돌 없이 중앙 정렬 */
          <div
            style={{
              position: 'fixed',
              bottom:    0,
              left:      0,
              right:     0,
              zIndex:    50,
              display:  'flex',
              justifyContent: 'center',
              padding:  '0 16px',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key={`panel-${currentStep.id}-${mode}`}
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              exit={{   y: 48, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width:         '100%',
                maxWidth:       860,
                height:        `${ph}px`,
                display:       'flex',
                flexDirection: 'column',
                pointerEvents: 'auto',
              }}
              className="bg-white rounded-t-3xl shadow-[0_-8px_48px_rgba(0,0,0,0.18)] overflow-hidden"
            >
              {/* 드래그 핸들 */}
              <div className="flex justify-center pt-2.5 flex-shrink-0">
                <div className="w-9 h-1 bg-gray-200 rounded-full" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col overflow-hidden flex-1"
                >
                  {mode === 'mini'     && <MiniContent />}
                  {mode === 'judgment' && <JudgmentContent />}
                  {mode === 'reading'  && <ReadingContent />}
                  {mode === 'feedback' && <FeedbackContent />}
                </motion.div>
              </AnimatePresence>

              <Nav />
            </motion.div>
          </div>
        )}
      </>
    </AnimatePresence>
  )
}
