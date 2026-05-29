'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore }    from '@/stores/chartStore'
import { calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { TutorialStep as TStep, CandleData } from '@/types'
import { clsx } from 'clsx'

/* ── Constants ────────────────────────────────────────────────── */
const PAD          = 6      // spotlight padding around target (px)
const SCROLL_MS    = 220    // delay after scroll before showing card
const CARD_W       = 340    // card width (px) — computed dynamically on mount
const CARD_MARGIN  = 14     // gap between spotlight ring and card
const AUTO_ADV_MS  = 1800   // ms before auto-advance after action complete

/* ── Types ────────────────────────────────────────────────────── */
type CardMode = 'idle' | 'judgment' | 'feedback' | 'test'

interface HL {
  top: number; left: number
  width: number; height: number
  bottom: number; right: number
}

interface CardPos { top: number; left: number }

/* ── Spotlight rect ───────────────────────────────────────────── */
function mkHL(el: Element): HL {
  const r = el.getBoundingClientRect()
  return {
    top:    r.top    - PAD,  left:   r.left   - PAD,
    width:  r.width  + PAD * 2, height: r.height + PAD * 2,
    bottom: r.bottom + PAD,  right:  r.right  + PAD,
  }
}

/* ── Dynamic card width (respects mobile viewport) ──────────── */
function getCardW(): number {
  if (typeof window === 'undefined') return CARD_W
  return Math.min(CARD_W, window.innerWidth - 16)
}

/* ── Card positioning algorithm ──────────────────────────────── */
function calcCardPos(
  hl: HL,
  preferred: string,
  cardW: number,
  cardH: number,
): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const M  = CARD_MARGIN
  const cx = hl.left + hl.width  / 2
  const cy = hl.top  + hl.height / 2

  const clampL = (x: number) => Math.max(8, Math.min(x, vw - cardW - 8))
  const clampT = (y: number) => Math.max(56, Math.min(y, vh - cardH - 8))

  const variants: Record<string, CardPos> = {
    top:    { top: hl.top - cardH - M,   left: clampL(cx - cardW / 2) },
    bottom: { top: hl.bottom + M,         left: clampL(cx - cardW / 2) },
    right:  { top: clampT(cy - cardH / 2), left: hl.right  + M },
    left:   { top: clampT(cy - cardH / 2), left: hl.left - cardW - M },
  }

  // Try preferred first, then others
  const order = [preferred, 'top', 'right', 'left', 'bottom'].filter(
    (v, i, a) => a.indexOf(v) === i
  )

  for (const pos of order) {
    const c = variants[pos]
    if (!c) continue
    if (
      c.top  >= 56  && c.top  + cardH <= vh - 8 &&
      c.left >= 8   && c.left + cardW <= vw - 8
    ) return c
  }

  // Fallback: clamp preferred
  const fb = variants[preferred] ?? variants.bottom
  return {
    top:  Math.max(56,  Math.min(fb.top,  vh - cardH - 8)),
    left: Math.max(8,   Math.min(fb.left, vw - cardW - 8)),
  }
}

/* ── smartScroll ──────────────────────────────────────────────── */
function smartScroll(step: TStep) {
  const subId =
    step.id === 'rsi-judgment'  ? 'rsi-chart'  :
    step.id === 'macd-judgment' ? 'macd-chart' : null

  const el = subId
    ? document.getElementById(subId)
    : document.querySelector(step.targetSelector)
  if (!el) return

  const r  = el.getBoundingClientRect()
  const vh = window.innerHeight
  if (r.bottom > vh - 60)
    window.scrollBy({ top: r.bottom - (vh - 80), behavior: 'smooth' })
  else if (r.top < 60)
    window.scrollBy({ top: r.top - 80, behavior: 'smooth' })
}

/* ══ Comprehensive test helpers ════════════════════════════════ */
function scoreTrend(c: CandleData[]): 'up' | 'sideways' | 'down' {
  if (c.length < 30) return 'sideways'
  const ma20 = calcMA(c, 20), ma60 = calcMA(c, 60)
  const n20 = ma20.length,  n60 = ma60.length
  if (n20 < 10) return 'sideways'
  const d20 = ma20[n20 - 1].value - ma20[Math.max(0, n20 - 10)].value
  const d60 = n60 >= 10 ? ma60[n60 - 1].value - ma60[Math.max(0, n60 - 10)].value : 0
  if (d20 > 0 && d60 >= 0) return 'up'
  if (d20 < 0 && d60 <= 0) return 'down'
  return 'sideways'
}
function scoreRSI(c: CandleData[]): 'overbought' | 'neutral' | 'oversold' {
  const rsi = calcRSI(c)
  const v   = rsi[rsi.length - 1]?.value ?? 50
  return v >= 65 ? 'overbought' : v <= 35 ? 'oversold' : 'neutral'
}
function scoreMACDSignal(c: CandleData[]): 'bullish' | 'bearish' {
  const d    = calcMACD(c).filter(x => x.signal !== null)
  const last = d[d.length - 1]
  if (!last) return 'bearish'
  return last.macd > (last.signal ?? 0) ? 'bullish' : 'bearish'
}

interface TestQ {
  id: string; label: string; hint: string
  choices: { v: string; icon: string; label: string }[]
  correct: string | null
  feedback: Record<string, string>
}

function buildTestQs(c: CandleData[]): TestQ[] {
  return [
    {
      id: 'trend', label: '📈 현재 추세는?', hint: 'MA 선들의 방향을 봐요',
      correct: scoreTrend(c),
      choices: [
        { v: 'up',       icon: '📈', label: '상승' },
        { v: 'sideways', icon: '➡️', label: '횡보' },
        { v: 'down',     icon: '📉', label: '하락' },
      ],
      feedback: {
        up:       'MA선들이 함께 우상향 중이에요. 상승 추세예요.',
        sideways: 'MA선들이 방향 없이 얽혀 있어요. 추세가 불분명해요.',
        down:     'MA선들이 함께 우하향 중이에요. 하락 추세예요.',
      },
    },
    {
      id: 'rsi', label: '🌡️ RSI 상태는?', hint: 'RSI 그래프 오른쪽 끝 값을 봐요',
      correct: scoreRSI(c),
      choices: [
        { v: 'overbought', icon: '🔴', label: '과열 (70+)' },
        { v: 'neutral',    icon: '⚪', label: '중립' },
        { v: 'oversold',   icon: '🟢', label: '침체 (30-)' },
      ],
      feedback: {
        overbought: 'RSI 65+ — 과매수 구간이에요. 조정 가능성이 있어요.',
        neutral:    'RSI 중립 구간이에요. 다른 지표와 함께 봐요.',
        oversold:   'RSI 35- — 과매도 구간이에요. 반등 가능성이 있어요.',
      },
    },
    {
      id: 'macd', label: '🔄 MACD 상태는?', hint: '파란선·주황선 위치를 봐요',
      correct: scoreMACDSignal(c),
      choices: [
        { v: 'bullish', icon: '🔵', label: '상승 모멘텀' },
        { v: 'bearish', icon: '🟠', label: '하락 모멘텀' },
      ],
      feedback: {
        bullish: 'MACD선이 시그널선 위에 있어요. 상승 모멘텀이에요.',
        bearish: 'MACD선이 시그널선 아래에 있어요. 하락 압력이에요.',
      },
    },
    {
      id: 'prediction', label: '🎯 당신의 예측은?', hint: '정답 없음 — 자유롭게 판단해봐요',
      correct: null,
      choices: [
        { v: 'up',       icon: '📈', label: '상승' },
        { v: 'sideways', icon: '➡️', label: '횡보' },
        { v: 'down',     icon: '📉', label: '하락' },
      ],
      feedback: {
        up:       '상승 예측! 시뮬레이션에서 직접 확인해봐요.',
        sideways: '횡보 예측! 시뮬레이션에서 검증해봐요.',
        down:     '하락 예측! 시뮬레이션에서 맞는지 확인해봐요.',
      },
    },
  ]
}

/* ══════════════════════════════════════════════════════════════
   TutorialStep — Main Component
══════════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const {
    currentStep, currentIndex, steps,
    stepDone, candleData: clickedCandle, chosenJudgment,
    next, prev, skip, notifyJudgment, markStepDone,
  } = useTutorialStore()
  const { activeIndicators, candleData: chartCandles } = useChartStore()

  /* ── State ────────────────────────────────────────────── */
  const [hl,       setHl]       = useState<HL | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [cardPos,  setCardPos]  = useState<CardPos | null>(null)

  const cardRef  = useRef<HTMLDivElement>(null)
  const stepTmr  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advTmr   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef   = useRef<number>(0)

  const [testQIdx,    setTestQIdx]    = useState(0)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})
  const [testDone,    setTestDone]    = useState(false)

  /* ── Derived mode ─────────────────────────────────────── */
  const mode: CardMode =
    !currentStep                                          ? 'idle' :
    currentStep.actionRequired === 'comprehensive-test'   ? 'test' :
    stepDone                                              ? 'feedback' :
    currentStep.actionRequired === 'judgment'             ? 'judgment' :
    'idle'

  /* ── Recompute spotlight + card position ─────────────── */
  const recompute = useCallback(() => {
    if (!currentStep || !showCard || !cardRef.current) return
    const cardW = getCardW()
    const cardH = cardRef.current.offsetHeight
    if (cardH === 0) return  // not measured yet

    const el = document.querySelector(currentStep.targetSelector)
    if (!el) {
      setHl(null)
      setCardPos({
        top:  72,
        left: Math.max(8, (window.innerWidth - cardW) / 2),
      })
      return
    }

    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setHl(null)
      setCardPos({
        top:  72,
        left: Math.max(8, (window.innerWidth - cardW) / 2),
      })
      return
    }

    const hlRect = mkHL(el)
    setHl(hlRect)
    setCardPos(calcCardPos(hlRect, currentStep.position, cardW, cardH))
  }, [currentStep, showCard])

  /* ── Step change ──────────────────────────────────────── */
  useEffect(() => {
    if (!currentStep) { setHl(null); setShowCard(false); setCardPos(null); return }

    // Clear pending timers
    if (stepTmr.current) clearTimeout(stepTmr.current)
    if (advTmr.current)  { clearTimeout(advTmr.current); advTmr.current = null }
    cancelAnimationFrame(rafRef.current)

    setShowCard(false); setHl(null); setCardPos(null)
    setTestQIdx(0); setTestAnswers({}); setTestDone(false)

    smartScroll(currentStep)

    stepTmr.current = setTimeout(() => setShowCard(true), SCROLL_MS)
    return () => { if (stepTmr.current) clearTimeout(stepTmr.current) }
  }, [currentStep])  // eslint-disable-line

  /* ── After showCard, measure + position ──────────────── */
  useEffect(() => {
    if (!showCard) return
    // Two-pass: render first (off-screen), then measure and reposition
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => recompute())
    })
    return () => cancelAnimationFrame(rafRef.current)
  }, [showCard, recompute])

  /* ── ResizeObserver: recompute when card height changes ─ */
  useEffect(() => {
    if (!cardRef.current || !showCard) return
    const obs = new ResizeObserver(() => recompute())
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [showCard, recompute])

  /* ── Scroll / resize ──────────────────────────────────── */
  useEffect(() => {
    const h = () => recompute()
    window.addEventListener('scroll', h, { passive: true })
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h); window.removeEventListener('resize', h) }
  }, [recompute])

  /* ── Indicator-toggle detection ──────────────────────── */
  useEffect(() => {
    if (!currentStep ||
        currentStep.actionRequired !== 'indicator-toggle' ||
        !currentStep.indicatorKey || stepDone) return
    if (activeIndicators.has(currentStep.indicatorKey as any)) markStepDone()
  }, [activeIndicators, currentStep, stepDone, markStepDone])

  /* ── Auto-advance after action ───────────────────────── */
  useEffect(() => {
    if (!stepDone || !currentStep) return
    if (advTmr.current) clearTimeout(advTmr.current)

    const autoAdv =
      currentStep.actionRequired === 'indicator-toggle' ||
      currentStep.actionRequired === 'judgment'         ||
      currentStep.actionRequired === 'candle-click'

    if (autoAdv) {
      advTmr.current = setTimeout(() => next(), AUTO_ADV_MS)
    }
    return () => { if (advTmr.current) clearTimeout(advTmr.current) }
  }, [stepDone, currentStep?.id])  // eslint-disable-line

  if (!currentStep) return null

  const isLast      = currentIndex === steps.length - 1
  const isAutoAdv   = stepDone && (
    currentStep.actionRequired === 'indicator-toggle' ||
    currentStep.actionRequired === 'judgment'         ||
    currentStep.actionRequired === 'candle-click'
  )
  const canNext =
    !currentStep.actionRequired ||
    currentStep.actionRequired === 'free' ||
    (currentStep.actionRequired === 'comprehensive-test' && testDone) ||
    stepDone

  /* ════ Sub-components (render as JSX, not React components, to avoid hook rules) ════ */

  /* Progress dots ─────────────────────────────────────── */
  const dotRow = (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
      <div className="flex gap-[3px] items-center">
        {steps.map((_, i) => (
          <div key={i} className={clsx(
            'rounded-full transition-all duration-300',
            i < currentIndex   ? 'w-[5px] h-[5px] bg-navi-accent/55' :
            i === currentIndex ? 'w-2 h-2 bg-navi-accent'             :
            'w-[5px] h-[5px] bg-navi-border2'
          )} />
        ))}
      </div>
      <span className="text-[10px] text-navi-muted tabular-nums ml-2 shrink-0">
        {currentIndex + 1} / {steps.length}
      </span>
    </div>
  )

  /* Nav row ────────────────────────────────────────────── */
  const navRow = (
    <div className="flex items-center justify-between px-4 py-3 border-t border-navi-border/40">
      <button
        onClick={skip}
        className="text-[10px] text-navi-muted hover:text-navi-secondary transition-colors"
      >
        건너뛰기
      </button>
      <div className="flex gap-1.5 items-center">
        {currentIndex > 0 && (
          <button
            onClick={prev}
            className="w-6 h-6 flex items-center justify-center rounded-md
                       text-[11px] text-navi-muted border border-navi-border2
                       hover:text-navi-text hover:border-navi-border transition"
          >
            ←
          </button>
        )}
        {!isLast ? (
          <button
            onClick={canNext && !isAutoAdv ? next : undefined}
            disabled={!canNext}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
              isAutoAdv
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                : canNext
                ? 'bg-navi-accent text-white hover:bg-navi-accent-hover active:scale-95 cursor-pointer'
                : 'bg-navi-surface3 text-navi-muted cursor-not-allowed'
            )}
          >
            {isAutoAdv ? '이동 중...' : canNext ? '다음 →' : '먼저 해보세요'}
          </button>
        ) : (
          <Link
            href="/simulate?from=tutorial"
            onClick={skip}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold
                       bg-navi-accent text-white hover:bg-navi-accent-hover transition active:scale-95"
          >
            🚀 시작하기
          </Link>
        )}
      </div>
    </div>
  )

  /* IDLE content ───────────────────────────────────────── */
  const idleContent = (
    <div className="px-4 py-3 space-y-2.5">
      <p className="text-[13.5px] font-bold text-navi-text leading-snug">
        {currentStep.title}
      </p>
      {currentStep.body && (
        <p className="text-[11.5px] text-navi-secondary leading-relaxed whitespace-pre-line">
          {currentStep.body}
        </p>
      )}
      {currentStep.tips && currentStep.tips.length > 0 && (
        <ul className="bg-navi-surface2 rounded-lg p-2.5 space-y-1">
          {currentStep.tips.map((tip, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] text-navi-secondary">
              <span className="text-navi-accent shrink-0 mt-px">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
      {currentStep.mission && (
        <div className="bg-navi-accent/[0.07] border border-navi-accent/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="w-1.5 h-1.5 rounded-full bg-navi-accent"
            />
            <span className="text-[9px] font-bold text-navi-accent uppercase tracking-[0.06em]">
              지금 해보세요
            </span>
          </div>
          <p className="text-[11.5px] text-navi-accent/85 leading-snug">
            {currentStep.mission}
          </p>
        </div>
      )}
    </div>
  )

  /* JUDGMENT content ───────────────────────────────────── */
  const judgmentContent = currentStep.judgment ? (
    <div className="px-4 py-3 space-y-2">
      <p className="text-[13px] font-bold text-navi-text leading-snug">{currentStep.title}</p>
      <p className="text-[11px] text-navi-secondary">{currentStep.judgment.question}</p>
      <div className="space-y-1.5">
        {currentStep.judgment.choices.map(c => (
          <button
            key={c.value}
            onClick={() => notifyJudgment(c.value)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                       border border-navi-border2 transition-all
                       hover:border-navi-accent/50 hover:bg-navi-accent/[0.06]
                       active:scale-[0.98]"
          >
            <span className="text-base shrink-0 leading-none">{c.icon}</span>
            <span className="text-[12px] font-medium text-navi-text">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null

  /* FEEDBACK content ───────────────────────────────────── */
  const feedbackContent = (
    <div className="px-4 py-3 space-y-2">
      <p className="text-[13px] font-bold text-navi-text leading-snug">{currentStep.title}</p>

      {/* Auto-advance indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        />
        <span className="text-[10px] text-emerald-400">
          잠시 후 다음 단계로 자동으로 이동해요
        </span>
      </div>

      {/* Judgment result */}
      {currentStep.actionRequired === 'judgment' &&
       currentStep.judgment && chosenJudgment && (() => {
         const chosen = currentStep.judgment!.choices.find(c => c.value === chosenJudgment)
         return chosen ? (
           <div className="bg-navi-accent/[0.07] border border-navi-accent/20 rounded-lg p-2.5">
             <div className="flex items-center gap-2 mb-1">
               <span className="leading-none">{chosen.icon}</span>
               <span className="text-[11px] font-semibold text-navi-accent">{chosen.label}</span>
             </div>
             <p className="text-[11px] text-navi-accent/80 leading-relaxed">
               {chosen.feedback}
             </p>
           </div>
         ) : null
       })()}

      {/* Candle OHLC */}
      {clickedCandle && currentStep.actionRequired === 'candle-click' && (
        <div className="bg-navi-surface2 rounded-lg p-2.5">
          <p className="text-[9px] text-navi-muted mb-1.5 font-semibold uppercase tracking-wide">
            📊 {clickedCandle.time}
          </p>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '시가', value: `$${clickedCandle.open.toFixed(1)}`,  col: '' },
              { label: '고가', value: `$${clickedCandle.high.toFixed(1)}`,  col: '#10b981' },
              { label: '저가', value: `$${clickedCandle.low.toFixed(1)}`,   col: '#ef4444' },
              { label: '종가', value: `$${clickedCandle.close.toFixed(1)}`, col: '' },
              {
                label: '등락',
                value: `${clickedCandle.close >= clickedCandle.open ? '+' : ''}${
                  ((clickedCandle.close - clickedCandle.open) / clickedCandle.open * 100).toFixed(1)
                }%`,
                col: clickedCandle.close >= clickedCandle.open ? '#10b981' : '#ef4444',
              },
            ].map(({ label, value, col }) => (
              <div key={label} className="flex flex-col items-center bg-navi-surface3 rounded px-0.5 py-1.5">
                <span className="text-[8px] text-navi-muted">{label}</span>
                <span className="text-[10px] font-bold mt-0.5"
                  style={col ? { color: col } : { color: '#F8F9F7' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion message */}
      {currentStep.completionMessage && (
        <div className="bg-navi-surface2 rounded-lg p-2.5">
          <p className="text-[11px] text-navi-secondary leading-relaxed">
            ✅ {currentStep.completionMessage}
          </p>
        </div>
      )}
    </div>
  )

  /* TEST content ───────────────────────────────────────── */
  const questions = buildTestQs(chartCandles)

  const testContent = (() => {
    if (testDone) {
      const score = questions.filter(q => q.correct && testAnswers[q.id] === q.correct).length
      const total = questions.filter(q => q.correct !== null).length
      return (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[13px] font-bold text-navi-text">
            {score >= total ? '🎯' : score >= total - 1 ? '✅' : '📚'}{' '}
            {score} / {total} 정답!
          </p>
          <div className="space-y-1">
            {questions.slice(0, 3).map(q => {
              const user = testAnswers[q.id]
              const ok   = user === q.correct
              return (
                <div key={q.id}
                  className={clsx(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]',
                    ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  )}>
                  <span>{ok ? '✅' : '❌'}</span>
                  <span className="flex-1 font-medium">{q.label}</span>
                  <span className="text-[10px] opacity-70">
                    {q.choices.find(c => c.v === user)?.label}
                  </span>
                </div>
              )
            })}
            <div className="bg-navi-accent/[0.07] text-navi-accent text-[11px] text-center py-2 rounded-lg">
              내 예측:{' '}
              {questions[3]?.choices.find(c => c.v === testAnswers['prediction'])?.icon}{' '}
              {questions[3]?.choices.find(c => c.v === testAnswers['prediction'])?.label}
              {' '}→ 시뮬레이션에서 직접 확인!
            </div>
          </div>
        </div>
      )
    }

    const q = questions[testQIdx]
    return (
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-bold text-navi-text">{q.label}</p>
          <span className="shrink-0 text-[9px] font-bold text-amber-400
                           bg-navi-surface2 px-1.5 py-0.5 rounded-full">
            {testQIdx + 1} / {questions.length}
          </span>
        </div>
        <p className="text-[10px] text-navi-muted">💡 {q.hint}</p>

        {/* Progress bar */}
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={clsx(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < testQIdx   ? 'bg-navi-accent'      :
              i === testQIdx ? 'bg-navi-accent/40'   :
              'bg-navi-border2'
            )} />
          ))}
        </div>

        <div className={clsx(
          'grid gap-1.5',
          q.choices.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        )}>
          {q.choices.map(c => (
            <button
              key={c.v}
              onClick={() => {
                const updated = { ...testAnswers, [q.id]: c.v }
                setTestAnswers(updated)
                if (testQIdx < questions.length - 1) {
                  setTimeout(() => setTestQIdx(i => i + 1), 260)
                } else {
                  setTestDone(true)
                  markStepDone()
                }
              }}
              className={clsx(
                'flex flex-col items-center py-2.5 rounded-lg border-2 transition-all active:scale-95',
                testAnswers[q.id] === c.v
                  ? 'border-navi-accent/70 bg-navi-accent/[0.08]'
                  : 'border-navi-border2 hover:border-navi-accent/40 hover:bg-navi-accent/[0.04]'
              )}
            >
              <span className="text-xl leading-none">{c.icon}</span>
              <span className="text-[10px] font-semibold text-navi-text mt-1
                               text-center leading-tight px-0.5">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  })()

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <AnimatePresence>
      <>
        {/* ── Dim overlay with spotlight cutout ── */}
        {hl && (
          <motion.div
            key={`overlay-${currentStep.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position:      'fixed',
              inset:          0,
              zIndex:         44,
              pointerEvents: 'none',
              background:    'rgba(0,0,0,0.54)',
              clipPath: `polygon(evenodd,
                0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px,
                ${hl.left}px ${hl.top}px,
                ${hl.right}px ${hl.top}px,
                ${hl.right}px ${hl.bottom}px,
                ${hl.left}px ${hl.bottom}px,
                ${hl.left}px ${hl.top}px
              )`,
            }}
          />
        )}

        {/* ── Spotlight glow ring ── */}
        {hl && (
          <motion.div
            key={`ring-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
            style={{
              position:      'fixed',
              top:            hl.top,
              left:           hl.left,
              width:          hl.width,
              height:         hl.height,
              zIndex:         45,
              pointerEvents: 'none',
              borderRadius:   10,
              boxShadow: [
                '0 0 0 1.5px #2D4198',
                '0 0 0 5px rgba(45,65,152,0.25)',
                '0 0 28px rgba(45,65,152,0.45)',
              ].join(', '),
            }}
          />
        )}

        {/* ── Floating tutorial card ── */}
        {showCard && (
          /* Outer div: positioning wrapper (off-screen until measured) */
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              width:    getCardW(),
              top:      cardPos?.top  ?? -9999,
              left:     cardPos?.left ?? -9999,
              zIndex:   50,
              maxWidth: 'calc(100vw - 16px)',
            }}
          >
            <motion.div
              key={`card-${currentStep.id}`}
              initial={{ opacity: 0, scale: 0.93, y: 10 }}
              animate={{
                opacity: cardPos ? 1 : 0,
                scale:   cardPos ? 1 : 0.93,
                y:       cardPos ? 0 : 10,
              }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="bg-navi-surface border border-navi-border rounded-xl
                         shadow-[0_12px_48px_rgba(0,0,0,0.55)] overflow-hidden"
            >
              {/* Progress dots */}
              {dotRow}

              {/* Content (animated on mode change) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${testQIdx}-${String(testDone)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  {mode === 'idle'     && idleContent}
                  {mode === 'judgment' && (judgmentContent ?? idleContent)}
                  {mode === 'feedback' && feedbackContent}
                  {mode === 'test'     && testContent}
                </motion.div>
              </AnimatePresence>

              {/* Nav */}
              {navRow}
            </motion.div>
          </div>
        )}
      </>
    </AnimatePresence>
  )
}
