'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore }    from '@/stores/chartStore'
import { useMobile }        from '@/hooks/useMobile'
import { calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { TutorialStep as TStep, CandleData, IndicatorSlug } from '@/types'
import { clsx } from 'clsx'

/* ── Constants ─────────────────────────────────────────────── */
const PAD         = 6
const SCROLL_MS   = 320   // smooth scroll 완료 대기 (was 220)
const CARD_W      = 340
const CARD_MARGIN = 14

/* ── Types ──────────────────────────────────────────────────── */
type CardMode = 'idle' | 'judgment' | 'feedback' | 'test'
interface HL { top:number; left:number; width:number; height:number; bottom:number; right:number }
interface CardPos { top:number; left:number }

/* ── 지표 이름 (모바일 인라인 버튼 레이블) ──────────────────── */
const INDICATOR_NAMES: Partial<Record<IndicatorSlug, string>> = {
  'moving-average': 'MA (이동평균선)',
  rsi:              'RSI',
  macd:             'MACD',
  bollinger:        'BB (볼린저밴드)',
}

function mkHL(el: Element): HL {
  const r = el.getBoundingClientRect()
  return {
    top: r.top - PAD, left: r.left - PAD,
    width: r.width + PAD * 2, height: r.height + PAD * 2,
    bottom: r.bottom + PAD, right: r.right + PAD,
  }
}

function getCardW() {
  return typeof window === 'undefined' ? CARD_W : Math.min(CARD_W, window.innerWidth - 16)
}

function calcCardPos(hl: HL, preferred: string, cardW: number, cardH: number): CardPos {
  const vw = window.innerWidth, vh = window.innerHeight
  const M  = CARD_MARGIN
  const cx = hl.left + hl.width / 2, cy = hl.top + hl.height / 2
  const clampL = (x: number) => Math.max(8, Math.min(x, vw - cardW - 8))
  const clampT = (y: number) => Math.max(56, Math.min(y, vh - cardH - 8))
  const v: Record<string, CardPos> = {
    top:    { top: hl.top - cardH - M,    left: clampL(cx - cardW / 2) },
    bottom: { top: hl.bottom + M,          left: clampL(cx - cardW / 2) },
    right:  { top: clampT(cy - cardH / 2), left: hl.right  + M },
    left:   { top: clampT(cy - cardH / 2), left: hl.left - cardW - M },
  }
  const order = [preferred, 'top', 'right', 'left', 'bottom'].filter((v, i, a) => a.indexOf(v) === i)
  for (const pos of order) {
    const c = v[pos]; if (!c) continue
    if (c.top >= 56 && c.top + cardH <= vh - 8 && c.left >= 8 && c.left + cardW <= vw - 8) return c
  }
  const fb = v[preferred] ?? v.bottom
  return { top: Math.max(56, Math.min(fb.top, vh - cardH - 8)), left: Math.max(8, Math.min(fb.left, vw - cardW - 8)) }
}

/* ── smartScroll — 모바일/PC 분기 ──────────────────────────── */
function smartScroll(step: TStep, isMobile: boolean) {
  // 모바일: mobileTargetSelector 우선 사용
  const sel = (isMobile && step.mobileTargetSelector !== undefined)
    ? step.mobileTargetSelector
    : step.targetSelector
  if (!sel) return

  const el = document.querySelector(sel)
  if (!el) return
  const r  = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return  // hidden element

  const vh = window.innerHeight

  if (isMobile) {
    // 시트 높이에 따라 safeBottom을 동적 계산
    // 판단/테스트 단계 = 55vh 시트 → safeBottom = 40%
    // 일반 단계        = 30vh 시트 → safeBottom = 65%
    const isLargeSheet =
      step.actionRequired === 'judgment' ||
      step.actionRequired === 'comprehensive-test'
    const sheetFraction = isLargeSheet ? 0.55 : 0.30
    const safeBottom    = vh * (1 - sheetFraction - 0.05)   // 5% 버퍼
    const idealTop      = 64

    if (r.top < idealTop) {
      window.scrollBy({ top: r.top - idealTop, behavior: 'smooth' })
    } else if (r.bottom > safeBottom) {
      window.scrollBy({ top: r.bottom - safeBottom + 10, behavior: 'smooth' })
    }
  } else {
    if (r.bottom > vh - 60)
      window.scrollBy({ top: r.bottom - (vh - 80), behavior: 'smooth' })
    else if (r.top < 60)
      window.scrollBy({ top: r.top - 80, behavior: 'smooth' })
  }
}

/* ══ Comprehensive test helpers ═════════════════════════════ */
function scoreTrend(c: CandleData[]): 'up' | 'sideways' | 'down' {
  if (c.length < 30) return 'sideways'
  const ma20 = calcMA(c, 20), ma60 = calcMA(c, 60)
  const n20 = ma20.length, n60 = ma60.length
  if (n20 < 10) return 'sideways'
  const d20 = ma20[n20-1].value - ma20[Math.max(0,n20-10)].value
  const d60 = n60 >= 10 ? ma60[n60-1].value - ma60[Math.max(0,n60-10)].value : 0
  if (d20 > 0 && d60 >= 0) return 'up'
  if (d20 < 0 && d60 <= 0) return 'down'
  return 'sideways'
}
function scoreRSI(c: CandleData[]): 'overbought'|'neutral'|'oversold' {
  const rsi = calcRSI(c), v = rsi[rsi.length-1]?.value ?? 50
  return v >= 65 ? 'overbought' : v <= 35 ? 'oversold' : 'neutral'
}
function scoreMACDSignal(c: CandleData[]): 'bullish'|'bearish' {
  const d = calcMACD(c).filter(x => x.signal !== null), last = d[d.length-1]
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
      id: 'trend', label: '현재 추세는?', hint: 'MA 선들의 방향을 봐요',
      correct: scoreTrend(c),
      choices: [
        { v: 'up', icon: '↑', label: '상승' },
        { v: 'sideways', icon: '→', label: '횡보' },
        { v: 'down', icon: '↓', label: '하락' },
      ],
      feedback: {
        up: 'MA선들이 함께 우상향 중이에요.', sideways: 'MA선들이 방향 없이 얽혀 있어요.', down: 'MA선들이 함께 우하향 중이에요.',
      },
    },
    {
      id: 'rsi', label: 'RSI 상태는?', hint: 'RSI 오른쪽 끝 값을 봐요',
      correct: scoreRSI(c),
      choices: [
        { v: 'overbought', icon: '↑', label: '과열 (70+)' },
        { v: 'neutral', icon: '—', label: '중립' },
        { v: 'oversold', icon: '↓', label: '침체 (30-)' },
      ],
      feedback: {
        overbought: 'RSI 65+ — 과매수 구간이에요.', neutral: 'RSI 중립 구간이에요.', oversold: 'RSI 35- — 과매도 구간이에요.',
      },
    },
    {
      id: 'macd', label: 'MACD 상태는?', hint: '파란선·주황선 위치를 봐요',
      correct: scoreMACDSignal(c),
      choices: [
        { v: 'bullish', icon: '↑', label: '상승 모멘텀' },
        { v: 'bearish', icon: '↓', label: '하락 모멘텀' },
      ],
      feedback: {
        bullish: 'MACD선이 시그널선 위에 있어요.', bearish: 'MACD선이 시그널선 아래에 있어요.',
      },
    },
    {
      id: 'prediction', label: '내 예측은?', hint: '정답 없음 — 자유롭게 판단해봐요',
      correct: null,
      choices: [
        { v: 'up', icon: '↑', label: '상승' },
        { v: 'sideways', icon: '→', label: '횡보' },
        { v: 'down', icon: '↓', label: '하락' },
      ],
      feedback: {
        up: '상승 예측! 실전 챌린지에서 확인해봐요.', sideways: '횡보 예측! 검증해봐요.', down: '하락 예측! 맞는지 확인해봐요.',
      },
    },
  ]
}

/* ══════════════════════════════════════════════════════════
   TutorialStep
══════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const {
    currentStep, currentIndex, steps, isLesson,
    stepDone, candleData: clickedCandle, chosenJudgment,
    next, prev, skip, complete, completeLesson, notifyJudgment, markStepDone,
  } = useTutorialStore()
  const { activeIndicators, candleData: chartCandles, toggleIndicator } = useChartStore()

  const isMobile   = useMobile()
  const isMobileRef = useRef(isMobile)
  useEffect(() => { isMobileRef.current = isMobile }, [isMobile])

  /* ── State ──────────────────────────────────────────── */
  const [hl,        setHl]        = useState<HL | null>(null)
  const [showCard,  setShowCard]  = useState(false)
  const [cardPos,   setCardPos]   = useState<CardPos | null>(null)
  const [bodyOpen,  setBodyOpen]  = useState(false)   // 모바일 더보기

  const cardRef = useRef<HTMLDivElement>(null)
  const stepTmr = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef  = useRef<number>(0)

  const [testQIdx,    setTestQIdx]    = useState(0)
  const [testAnswers, setTestAnswers] = useState<Record<string,string>>({})
  const [testDone,    setTestDone]    = useState(false)
  const [wrongCount,  setWrongCount]  = useState(0)
  const [showWrongFB, setShowWrongFB] = useState(false)
  const [wrongChoice, setWrongChoice] = useState<string|null>(null)

  /* ── Derived mode ───────────────────────────────────── */
  const mode: CardMode =
    !currentStep                                        ? 'idle' :
    currentStep.actionRequired === 'comprehensive-test' ? 'test' :
    stepDone                                            ? 'feedback' :
    currentStep.actionRequired === 'judgment'           ? 'judgment' :
    'idle'

  /* ── 모바일 시트 높이: 판단/테스트는 더 크게 ────────── */
  const mobileSheetMaxH =
    mode === 'judgment' || mode === 'test' ? '55vh' : '30vh'

  /* ── 모바일 텍스트 분기 헬퍼 ────────────────────────── */
  const activeMission = (isMobile && currentStep?.mobileMission)
    ? currentStep.mobileMission
    : currentStep?.mission
  const activeTips = (isMobile && currentStep?.mobileTips)
    ? currentStep.mobileTips
    : currentStep?.tips

  /* ── 대상 요소 selector ─────────────────────────────
     피드백 모드(stepDone=true)에서는 completionTargetSelector 우선 사용
     → 지표 토글 후 "버튼"이 아닌 "차트"를 spotlight
  ─────────────────────────────────────────────────── */
  const activeSelector = (() => {
    if (!currentStep) return undefined
    if (stepDone) {
      // 완료 후: 모바일 completion selector → PC completion selector → 기본 selector
      const mobCompl = currentStep.mobileCompletionTargetSelector
      const compl    = currentStep.completionTargetSelector
      if (isMobile && mobCompl !== undefined) return mobCompl
      if (compl) return compl
    }
    // 일반: 모바일 selector 우선
    if (isMobile && currentStep.mobileTargetSelector !== undefined) {
      return currentStep.mobileTargetSelector
    }
    return currentStep.targetSelector
  })()

  /* ── Spotlight 계산 ─────────────────────────────────── */
  const computeHL = useCallback(() => {
    if (!activeSelector) return null
    const el = document.querySelector(activeSelector)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return null  // hidden
    const vh = window.innerHeight
    if (r.bottom < 0 || r.top > vh) return null
    return mkHL(el)
  }, [activeSelector])

  /* ── Recompute (PC 플로팅 위치 계산 포함) ───────────── */
  const recompute = useCallback(() => {
    if (!currentStep || !showCard) return
    const hlRect = computeHL()
    setHl(hlRect)

    // 모바일: 위치 계산 불필요 (고정 하단 시트)
    if (isMobileRef.current) return

    if (!cardRef.current) return
    const cardW = getCardW()
    const cardH = cardRef.current.offsetHeight
    if (cardH === 0) return
    const vw = window.innerWidth, vh = window.innerHeight

    if (currentStep.floatSide) {
      const M = 16
      setCardPos(
        vw >= 768
          ? { left: vw - cardW - M, top: Math.max(56, vh - cardH - M) }
          : { left: Math.max(M, (vw - cardW) / 2), top: Math.max(56, vh - cardH - M) }
      )
      return
    }
    if (!hlRect) {
      setCardPos({ top: 72, left: Math.max(8, (vw - cardW) / 2) })
      return
    }
    setCardPos(calcCardPos(hlRect, currentStep.position, cardW, cardH))
  }, [currentStep, showCard, computeHL])

  /* ── Step 변경 ──────────────────────────────────────── */
  useEffect(() => {
    if (!currentStep) { setHl(null); setShowCard(false); setCardPos(null); return }

    if (stepTmr.current) clearTimeout(stepTmr.current)
    cancelAnimationFrame(rafRef.current)

    setShowCard(false); setHl(null); setCardPos(null)
    setTestQIdx(0); setTestAnswers({}); setTestDone(false)
    setWrongCount(0); setShowWrongFB(false); setWrongChoice(null)
    setBodyOpen(false)

    smartScroll(currentStep, isMobileRef.current)
    stepTmr.current = setTimeout(() => setShowCard(true), SCROLL_MS)
    return () => { if (stepTmr.current) clearTimeout(stepTmr.current) }
  }, [currentStep]) // eslint-disable-line

  /* ── 단계 완료 시 → completion target으로 스크롤 ────── */
  useEffect(() => {
    if (!stepDone || !currentStep) return
    const sel = (() => {
      if (isMobileRef.current) {
        const mob = currentStep.mobileCompletionTargetSelector
        if (mob !== undefined) return mob
      }
      return currentStep.completionTargetSelector
    })()
    if (!sel) return
    // completionTargetSelector를 target으로 한 가상 step으로 스크롤
    setTimeout(() => {
      smartScroll(
        { ...currentStep, targetSelector: sel, mobileTargetSelector: sel },
        isMobileRef.current
      )
    }, 80)
  }, [stepDone]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 카드 마운트 후 위치 계산 (PC) ──────────────────── */
  useEffect(() => {
    if (!showCard) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => recompute())
    })
    return () => cancelAnimationFrame(rafRef.current)
  }, [showCard, recompute])

  useEffect(() => {
    if (!cardRef.current || !showCard) return
    const obs = new ResizeObserver(() => recompute())
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [showCard, recompute])

  useEffect(() => {
    const h = () => recompute()
    window.addEventListener('scroll', h, { passive: true })
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h); window.removeEventListener('resize', h) }
  }, [recompute])

  /* ── indicator-toggle 감지 ──────────────────────────── */
  useEffect(() => {
    if (!currentStep || currentStep.actionRequired !== 'indicator-toggle' ||
        !currentStep.indicatorKey || stepDone) return
    if (activeIndicators.has(currentStep.indicatorKey as any)) markStepDone()
  }, [activeIndicators, currentStep, stepDone, markStepDone])

  if (!currentStep) return null

  const isLast  = currentIndex === steps.length - 1
  const canNext =
    !currentStep.actionRequired ||
    currentStep.actionRequired === 'free' ||
    (currentStep.actionRequired === 'comprehensive-test' && testDone) ||
    stepDone

  /* ════ 공통 서브-컴포넌트 ════════════════════════════ */

  /* 진행 바 + 나가기 버튼 (모바일) */
  const mobileProg = (
    <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
      {/* 얇은 프로그레스 바 */}
      <div className="flex-1 flex gap-[2px]">
        {steps.map((_, i) => (
          <div key={i} className={clsx(
            'h-[3px] flex-1 rounded-full transition-all duration-300',
            i < currentIndex  ? 'bg-navi-action/70' :
            i === currentIndex ? 'bg-navi-action'    : 'bg-navi-border2'
          )} />
        ))}
      </div>
      <span className="text-[10px] tabular-nums text-quiet-45 shrink-0">
        {currentIndex + 1}/{steps.length}
      </span>
      {/* ✕ 나가기 버튼 */}
      <button
        onClick={skip}
        aria-label="학습 나가기"
        className="ml-0.5 w-6 h-6 flex items-center justify-center rounded-full
                   bg-navi-surface3 border border-navi-border2
                   text-[11px] text-navi-muted
                   hover:bg-navi-surface2 hover:text-navi-text
                   transition-all active:scale-90"
      >
        ✕
      </button>
    </div>
  )

  const pcDotRow = (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
      <div className="flex gap-[3px] items-center">
        {steps.map((_, i) => (
          <div key={i} className={clsx(
            'rounded-full transition-all duration-300',
            i < currentIndex   ? 'w-[5px] h-[5px] bg-navi-action/60' :
            i === currentIndex ? 'w-2 h-2 bg-navi-action'             :
            'w-[5px] h-[5px] bg-navi-border2'
          )} />
        ))}
      </div>
      <span className="text-[10px] tabular-nums ml-2 shrink-0 text-quiet-45">
        {currentIndex + 1} / {steps.length}
      </span>
    </div>
  )

  /* 네비 행 — PC */
  const pcNavRow = (
    <div className="flex items-center justify-between px-4 py-3 border-t border-navi-border/40">
      <button onClick={skip}
        className="text-[10px] text-quiet-35 hover:text-navi-secondary transition-colors">
        건너뛰기
      </button>
      <div className="flex gap-1.5 items-center">
        {currentIndex > 0 && (
          <button onClick={prev}
            className="w-6 h-6 flex items-center justify-center rounded-md
                       text-[11px] text-navi-muted border border-navi-border2
                       hover:text-navi-text hover:border-navi-border transition">←</button>
        )}
        {!isLast ? (
          <button onClick={canNext ? next : undefined} disabled={!canNext}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
              canNext
                ? 'bg-navi-action text-white hover:bg-navi-action-hover active:scale-95 cursor-pointer shadow-[0_2px_12px_rgba(91,127,255,0.3)]'
                : 'bg-navi-surface3 text-navi-disabled cursor-not-allowed'
            )}>
            {canNext ? '다음 →' : '먼저 해보세요'}
          </button>
        ) : isLesson ? (
          <button onClick={completeLesson}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover transition active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.35)]">
            학습 완료
          </button>
        ) : (
          <button onClick={complete}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover transition active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.35)]">
            기초 과정 완료
          </button>
        )}
      </div>
    </div>
  )

  /* 네비 행 — 모바일 (터치 타깃 확대) */
  const mobileNavRow = (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-navi-border/40">
      <button onClick={skip}
        className="text-[11px] text-quiet-35 hover:text-navi-secondary transition-colors py-1 px-0.5">
        건너뛰기
      </button>
      <div className="flex gap-2 items-center">
        {currentIndex > 0 && (
          <button onClick={prev}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       text-[13px] text-navi-muted border border-navi-border2
                       hover:text-navi-text hover:border-navi-border transition">←</button>
        )}
        {!isLast ? (
          <button onClick={canNext ? next : undefined} disabled={!canNext}
            className={clsx(
              'px-5 h-9 rounded-xl text-[12px] font-semibold transition-all',
              canNext
                ? 'bg-navi-action text-white hover:bg-navi-action-hover active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.3)]'
                : 'bg-navi-surface3 text-navi-disabled cursor-not-allowed'
            )}>
            {canNext ? '다음 →' : '먼저 해보세요'}
          </button>
        ) : isLesson ? (
          <button onClick={completeLesson}
            className="px-5 h-9 rounded-xl text-[12px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover transition active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.35)]">
            학습 완료
          </button>
        ) : (
          <button onClick={complete}
            className="px-5 h-9 rounded-xl text-[12px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover transition active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.35)]">
            기초 과정 완료
          </button>
        )}
      </div>
    </div>
  )

  /* ── IDLE 콘텐츠 ─────────────────────────────────────── */
  const idleContent = (
    <div className={clsx('px-4 space-y-2', isMobile ? 'py-2' : 'py-3.5')}>
      <p className={clsx('font-bold text-navi-text leading-snug', isMobile ? 'text-[13px]' : 'text-[14px]')}>
        {currentStep.title}
      </p>

      {/* 모바일: 본문 접기/펼치기 */}
      {isMobile ? (
        <>
          {currentStep.body && (
            <p className={clsx(
              'text-[12px] text-navi-secondary leading-relaxed whitespace-pre-line',
              !bodyOpen && 'line-clamp-2'
            )}>
              {currentStep.body}
            </p>
          )}
          {/* 더보기 버튼: 긴 본문 or tips 있을 때 */}
          {!bodyOpen && ((currentStep.body?.length ?? 0) > 70 || (activeTips?.length ?? 0) > 0) && (
            <button
              onClick={() => setBodyOpen(true)}
              className="text-[11px] text-navi-action font-medium"
            >
              자세히 보기 ↓
            </button>
          )}
          {bodyOpen && activeTips && activeTips.length > 0 && (
            <ul className="bg-navi-surface2 rounded-lg p-2.5 space-y-1">
              {activeTips.map((tip, i) => (
                <li key={i} className="flex gap-1.5 text-[11.5px] text-navi-secondary">
                  <span className="text-navi-muted shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
          {bodyOpen && (
            <button onClick={() => setBodyOpen(false)} className="text-[11px] text-navi-muted">접기 ↑</button>
          )}
        </>
      ) : (
        <>
          {currentStep.body && (
            <p className="text-[12px] text-navi-secondary leading-relaxed whitespace-pre-line">
              {currentStep.body}
            </p>
          )}
          {currentStep.tips && currentStep.tips.length > 0 && (
            <ul className="bg-navi-surface2 rounded-lg p-3 space-y-1.5">
              {currentStep.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-navi-secondary">
                  <span className="text-navi-muted shrink-0 mt-px">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Mission 박스 */}
      {activeMission && (
        <div className={clsx(
          'bg-navi-action/[0.09] border border-navi-action/25 rounded-lg',
          isMobile ? 'p-2.5' : 'p-3'
        )}>
          {!isMobile && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.3 }}
                className="w-1.5 h-1.5 rounded-full bg-navi-action"
              />
              <span className="text-[10px] font-bold text-navi-action uppercase tracking-[0.06em]">지금 해보세요</span>
            </div>
          )}
          <p className={clsx('text-navi-text leading-snug', isMobile ? 'text-[12px]' : 'text-[12px]')}>
            {isMobile ? '▶ ' : ''}{activeMission}
          </p>
        </div>
      )}

      {/* indicator-toggle 단계: 아래 버튼이 하이라이트되어 있음 (spotlight) */}
    </div>
  )

  /* ── 판단 클릭 핸들러 ────────────────────────────────── */
  function handleJudgmentClick(value: string) {
    if (!currentStep?.judgment) return
    const { correctValue } = currentStep.judgment
    if (correctValue !== undefined) {
      if (value === correctValue) {
        setWrongCount(0); setShowWrongFB(false); setWrongChoice(null)
        notifyJudgment(value)
      } else {
        setWrongCount(c => c + 1); setWrongChoice(value); setShowWrongFB(true)
      }
    } else {
      notifyJudgment(value)
    }
  }

  /* ── JUDGMENT 콘텐츠 ─────────────────────────────────── */
  const judgmentContent = currentStep.judgment ? (
    <div className={clsx('px-4 space-y-2', isMobile ? 'py-2' : 'py-3')}>
      <p className={clsx('font-bold text-navi-text leading-snug', isMobile ? 'text-[13px]' : 'text-[14px]')}>
        {currentStep.title}
      </p>
      <p className="text-[12px] text-navi-secondary">{currentStep.judgment.question}</p>

      <AnimatePresence mode="wait">
        {showWrongFB ? (
          <motion.div key="wrong"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="space-y-2"
          >
            <div className="bg-navi-danger/[0.08] border border-navi-danger/25 rounded-lg p-3">
              <p className="text-[12px] font-semibold text-navi-text mb-1">❌ 다시 살펴보세요</p>
              {wrongChoice && (() => {
                const ch = currentStep.judgment!.choices.find(c => c.value === wrongChoice)
                return ch ? (
                  <p className="text-[11.5px] text-navi-secondary leading-relaxed">
                    {ch.label} — {ch.feedback}
                  </p>
                ) : null
              })()}
            </div>
            {currentStep.judgment.hints && (
              <div className="bg-navi-surface3 rounded-lg px-3 py-2">
                <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-1">힌트</p>
                {currentStep.judgment.hints.map((h, i) => (
                  <p key={i} className="text-[11.5px] text-navi-secondary">• {h}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => { setShowWrongFB(false); setWrongChoice(null) }}
              className={clsx(
                'w-full rounded-lg text-[12px] font-semibold border border-navi-border2 text-navi-text',
                'hover:border-navi-action/40 hover:bg-navi-action/[0.06] transition-all active:scale-[0.98]',
                isMobile ? 'py-3' : 'py-2'
              )}
            >
              다시 시도 →
            </button>
            {wrongCount >= 2 && (
              <button
                onClick={() => { notifyJudgment(currentStep.judgment!.correctValue!); setShowWrongFB(false) }}
                className="w-full py-1.5 text-[11px] text-navi-muted hover:text-navi-secondary text-center"
              >
                정답 보기
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="choices"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="space-y-1.5"
          >
            {currentStep.judgment.choices.map(c => (
              <button
                key={c.value}
                onClick={() => handleJudgmentClick(c.value)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 rounded-lg text-left border border-navi-border2',
                  'transition-all hover:border-navi-action/40 hover:bg-navi-action/[0.06] active:scale-[0.98]',
                  isMobile ? 'py-3 rounded-xl' : 'py-2.5'
                )}
              >
                <span className="text-[15px] font-bold shrink-0 leading-none text-navi-text w-5 text-center">
                  {c.icon}
                </span>
                <span className={clsx('font-medium text-navi-text', isMobile ? 'text-[13px]' : 'text-[12px]')}>
                  {c.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : null

  /* ── FEEDBACK 콘텐츠 ─────────────────────────────────── */
  const feedbackContent = (
    <div className={clsx('px-4 space-y-2.5', isMobile ? 'py-2' : 'py-3.5')}>
      <p className={clsx('font-bold text-navi-text leading-snug', isMobile ? 'text-[13px]' : 'text-[14px]')}>
        {currentStep.title}
      </p>

      {currentStep.actionRequired === 'judgment' && currentStep.judgment && chosenJudgment && (() => {
        const chosen    = currentStep.judgment!.choices.find(c => c.value === chosenJudgment)
        const isCorrect = currentStep.judgment!.correctValue !== undefined
                          && chosenJudgment === currentStep.judgment!.correctValue
        return chosen ? (
          <div className={clsx(
            'rounded-lg p-3',
            isCorrect ? 'bg-navi-success/[0.07] border border-navi-success/25'
                      : 'bg-navi-info/[0.07] border border-navi-info/25'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              {isCorrect && <span className="text-[11px] font-bold text-navi-success">✓</span>}
              <span className="text-[14px] font-bold leading-none text-navi-text">{chosen.icon}</span>
              <span className="text-[12px] font-semibold text-navi-text">{chosen.label}</span>
            </div>
            <p className="text-[12px] text-navi-secondary leading-relaxed">{chosen.feedback}</p>
          </div>
        ) : null
      })()}

      {clickedCandle && currentStep.actionRequired === 'candle-click' && (
        <div className="bg-navi-surface2 rounded-lg p-2.5">
          <p className="text-[10px] text-navi-muted mb-2 font-semibold uppercase tracking-wide">
            {clickedCandle.time}
          </p>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '시가', value: `$${clickedCandle.open.toFixed(1)}`,  type: 'neutral' as const },
              { label: '고가', value: `$${clickedCandle.high.toFixed(1)}`,  type: 'up' as const },
              { label: '저가', value: `$${clickedCandle.low.toFixed(1)}`,   type: 'down' as const },
              { label: '종가', value: `$${clickedCandle.close.toFixed(1)}`, type: 'neutral' as const },
              {
                label: '등락',
                value: `${clickedCandle.close >= clickedCandle.open ? '+' : ''}${((clickedCandle.close - clickedCandle.open) / clickedCandle.open * 100).toFixed(1)}%`,
                type: (clickedCandle.close >= clickedCandle.open ? 'up' : 'down') as 'up'|'down',
              },
            ].map(({ label, value, type }) => (
              <div key={label} className={clsx(
                'flex flex-col items-center rounded px-0.5 py-1.5',
                type === 'up'   ? 'bg-navi-success/[0.08] border border-navi-success/20' :
                type === 'down' ? 'bg-navi-danger/[0.08]  border border-navi-danger/20'  :
                'bg-navi-surface3'
              )}>
                <span className="text-[10px] text-navi-secondary">{label}</span>
                <span className="text-[12px] font-bold mt-0.5 text-navi-text">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentStep.completionMessage && (
        <div className="bg-navi-success/[0.07] border border-navi-success/25 rounded-lg p-3">
          <p className="text-[12px] text-navi-text leading-relaxed">
            ✓ {currentStep.completionMessage}
          </p>
        </div>
      )}
    </div>
  )

  /* ── TEST 콘텐츠 ─────────────────────────────────────── */
  const questions = buildTestQs(chartCandles)
  const testContent = (() => {
    if (testDone) {
      const score = questions.filter(q => q.correct && testAnswers[q.id] === q.correct).length
      const total = questions.filter(q => q.correct !== null).length
      return (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[14px] font-bold text-navi-text">{score} / {total} 정답</p>
          <div className="space-y-1">
            {questions.slice(0, 3).map(q => {
              const user = testAnswers[q.id], ok = user === q.correct
              return (
                <div key={q.id} className={clsx(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]',
                  ok ? 'bg-navi-success/[0.08] border border-navi-success/25 text-navi-text'
                     : 'bg-navi-danger/[0.08]  border border-navi-danger/25  text-navi-text'
                )}>
                  <span>{ok ? '✓' : '✗'}</span>
                  <span className="flex-1 font-medium">{q.label}</span>
                  <span className="text-[10px] text-navi-secondary">{q.choices.find(c => c.v === user)?.label}</span>
                </div>
              )
            })}
            <div className="bg-navi-info/[0.07] text-navi-text text-[12px] text-center py-2 rounded-lg border border-navi-info/25">
              내 예측: {questions[3]?.choices.find(c => c.v === testAnswers['prediction'])?.label} → 실전 챌린지에서 확인해봐요
            </div>
          </div>
        </div>
      )
    }

    const q = questions[testQIdx]
    return (
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className={clsx('font-bold text-navi-text', isMobile ? 'text-[12px]' : 'text-[12.5px]')}>{q.label}</p>
          <span className="shrink-0 text-[9px] font-bold text-navi-text bg-navi-surface3 px-1.5 py-0.5 rounded-full border border-navi-border2">
            {testQIdx + 1}/{questions.length}
          </span>
        </div>
        <p className="text-[11px] text-navi-muted">힌트 · {q.hint}</p>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={clsx(
              'h-1 flex-1 rounded-full transition-all',
              i < testQIdx ? 'bg-navi-action' : i === testQIdx ? 'bg-navi-action/40' : 'bg-navi-border2'
            )} />
          ))}
        </div>
        <div className={clsx('grid gap-1.5', q.choices.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
          {q.choices.map(c => (
            <button
              key={c.v}
              onClick={() => {
                const updated = { ...testAnswers, [q.id]: c.v }
                setTestAnswers(updated)
                if (testQIdx < questions.length - 1) {
                  setTimeout(() => setTestQIdx(i => i + 1), 260)
                } else {
                  setTestDone(true); markStepDone()
                }
              }}
              className={clsx(
                'flex flex-col items-center rounded-lg border-2 transition-all active:scale-95',
                isMobile ? 'py-3.5' : 'py-3',
                testAnswers[q.id] === c.v
                  ? 'border-navi-action/70 bg-navi-action/[0.10]'
                  : 'border-navi-border2 hover:border-navi-action/35 hover:bg-navi-action/[0.04]'
              )}
            >
              <span className="text-[18px] font-bold leading-none text-navi-text">{c.icon}</span>
              <span className="text-[11px] font-semibold text-navi-text mt-1 text-center leading-tight px-0.5">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  })()

  /* ── 공통 콘텐츠 블록 ──────────────────────────────── */
  const contentBlock = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${mode}-${testQIdx}-${String(testDone)}-${String(showWrongFB)}`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        {mode === 'idle'     && idleContent}
        {mode === 'judgment' && (judgmentContent ?? idleContent)}
        {mode === 'feedback' && feedbackContent}
        {mode === 'test'     && testContent}
      </motion.div>
    </AnimatePresence>
  )

  /* ══════════════════════════ RENDER ══════════════════ */
  return (
    <AnimatePresence>
      <>
        {/* Dim overlay (spotlight cutout) */}
        {hl && (
          <motion.div
            key={`overlay-${currentStep.id}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 44, pointerEvents: 'none',
              background: 'rgba(0,0,0,0.54)',
              clipPath: `polygon(evenodd,
                0px 0px,100% 0px,100% 100%,0px 100%,0px 0px,
                ${hl.left}px ${hl.top}px,${hl.right}px ${hl.top}px,
                ${hl.right}px ${hl.bottom}px,${hl.left}px ${hl.bottom}px,
                ${hl.left}px ${hl.top}px)`,
            }}
          />
        )}

        {/* Spotlight glow ring */}
        {hl && (
          <motion.div
            key={`ring-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
            style={{
              position: 'fixed', top: hl.top, left: hl.left, width: hl.width, height: hl.height,
              zIndex: 45, pointerEvents: 'none', borderRadius: 10,
              boxShadow: '0 0 0 1.5px #2D4198,0 0 0 5px rgba(45,65,152,0.25),0 0 28px rgba(45,65,152,0.45)',
            }}
          />
        )}

        {showCard && (
          isMobile ? (
            /* ════ 모바일: 고정 Bottom Sheet (컴팩트) ════ */
            <motion.div
              key={`mobile-card-${currentStep.id}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                maxHeight: mobileSheetMaxH,
                display: 'flex', flexDirection: 'column',
              }}
              className="bg-navi-surface border-t border-navi-border rounded-t-2xl overflow-hidden"
            >
              {/* 드래그 핸들 */}
              <div className="flex-shrink-0 flex justify-center pt-2 pb-0.5">
                <div className="w-8 h-[3px] rounded-full bg-navi-border2" />
              </div>

              {/* 얇은 프로그레스 바 */}
              <div className="flex-shrink-0">{mobileProg}</div>

              {/* 스크롤 가능한 콘텐츠 */}
              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {contentBlock}
              </div>

              {/* 네비 */}
              <div className="flex-shrink-0">{mobileNavRow}</div>
            </motion.div>
          ) : (
            /* ════ PC: 플로팅 카드 ════ */
            <div
              ref={cardRef}
              style={{
                position: 'fixed',
                width: getCardW(),
                top:  cardPos?.top  ?? -9999,
                left: cardPos?.left ?? -9999,
                zIndex: 50,
                maxWidth: 'calc(100vw - 16px)',
              }}
            >
              <motion.div
                key={`card-${currentStep.id}`}
                initial={{ opacity: 0, scale: 0.93, y: 10 }}
                animate={{ opacity: cardPos ? 1 : 0, scale: cardPos ? 1 : 0.93, y: cardPos ? 0 : 10 }}
                exit={{ opacity: 0, scale: 0.93, y: 10 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="bg-navi-surface border border-navi-border rounded-xl
                           shadow-[0_12px_48px_rgba(0,0,0,0.55)] overflow-hidden"
              >
                {pcDotRow}
                {contentBlock}
                {pcNavRow}
              </motion.div>
            </div>
          )
        )}
      </>
    </AnimatePresence>
  )
}
