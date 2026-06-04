'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore }    from '@/stores/chartStore'
import { useMobile }        from '@/hooks/useMobile'
import { calcMA, calcRSI, calcMACD, calcBollingerBands } from '@/lib/indicators'
import { trackEvent }       from '@/lib/analytics'
import type { TutorialStep as TStep, CandleData, IndicatorSlug } from '@/types'
import { clsx } from 'clsx'

/* ── Constants ─────────────────────────────────────────────── */
const PAD         = 6
const SCROLL_MS   = 320   // smooth scroll 완료 대기 (was 220)
const CARD_W      = 340
const CARD_MARGIN = 14

/* ── Types ──────────────────────────────────────────────────── */
type CardMode = 'idle' | 'judgment' | 'feedback' | 'test'
type Side     = 'top' | 'right' | 'left' | 'bottom'
interface HL      { top:number; left:number; width:number; height:number; bottom:number; right:number }
interface CardPos { top:number; left:number }
interface CalcResult { pos: CardPos; side: Side }

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

function calcCardPos(hl: HL, preferred: string, cardW: number, cardH: number): CalcResult {
  const vw = window.innerWidth, vh = window.innerHeight
  const M  = CARD_MARGIN
  const cx = hl.left + hl.width / 2, cy = hl.top + hl.height / 2
  const clampL = (x: number) => Math.max(8, Math.min(x, vw - cardW - 8))
  const clampT = (y: number) => Math.max(56, Math.min(y, vh - cardH - 8))
  const v: Record<Side, CardPos> = {
    top:    { top: hl.top - cardH - M,    left: clampL(cx - cardW / 2) },
    bottom: { top: hl.bottom + M,          left: clampL(cx - cardW / 2) },
    right:  { top: clampT(cy - cardH / 2), left: hl.right  + M },
    left:   { top: clampT(cy - cardH / 2), left: hl.left - cardW - M },
  }
  const order = ([preferred, 'top', 'right', 'left', 'bottom'] as Side[])
    .filter((s, i, a) => a.indexOf(s) === i)
  for (const side of order) {
    const c = v[side]; if (!c) continue
    if (c.top >= 56 && c.top + cardH <= vh - 8 && c.left >= 8 && c.left + cardW <= vw - 8) {
      return { pos: c, side }
    }
  }
  const fallbackKey = (preferred in v ? preferred : 'bottom') as Side
  const fb = v[fallbackKey] ?? v.bottom
  return {
    pos: { top: Math.max(56, Math.min(fb.top, vh - cardH - 8)), left: Math.max(8, Math.min(fb.left, vw - cardW - 8)) },
    side: fallbackKey,
  }
}

/* ── scrollToSel — retry-safe 스크롤 헬퍼 ──────────────────
   RSI/MACD 차트처럼 막 렌더링된 요소는 첫 시도에서 rect=0 일 수 있음.
   최대 maxRetry 회, retryMs 간격으로 재시도해 안정적으로 스크롤한다.
─────────────────────────────────────────────────────────── */
function scrollToSel(
  sel:       string,
  step:      TStep,
  isMobile:  boolean,
  maxRetry = 5,
  retryMs  = 110,
) {
  const el = document.querySelector(sel)
  if (!el) {
    if (maxRetry > 0) setTimeout(() => scrollToSel(sel, step, isMobile, maxRetry - 1, retryMs), retryMs)
    return
  }
  const r = el.getBoundingClientRect()
  // 렌더링 전 or display:none → 재시도
  if (r.width === 0 && r.height === 0) {
    if (maxRetry > 0) setTimeout(() => scrollToSel(sel, step, isMobile, maxRetry - 1, retryMs), retryMs)
    return
  }

  const vh = window.innerHeight

  if (isMobile) {
    const isLargeSheet =
      step.actionRequired === 'judgment' ||
      step.actionRequired === 'comprehensive-test'
    const sheetFraction = isLargeSheet ? 0.55 : 0.30
    const safeBottom    = vh * (1 - sheetFraction - 0.05)
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

/* ── smartScroll — 모바일/PC selector 분기 → scrollToSel ── */
function smartScroll(step: TStep, isMobile: boolean) {
  const sel = (isMobile && step.mobileTargetSelector !== undefined)
    ? step.mobileTargetSelector
    : step.targetSelector
  if (!sel) return
  scrollToSel(sel, step, isMobile)
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

/* ── 기초 튜토리얼 judgment 전용 채점 함수 ──────────────────
   각 함수의 반환값은 tutorialSteps.ts 선지의 value와 1:1 매칭
─────────────────────────────────────────────────────────── */

/** macd-judgment: 'macd-above' | 'signal-above' | 'crossing'
 *  두 선의 차이가 절대값 대비 10% 미만이면 교차 판정 */
function scoreMACDJudgment(c: CandleData[]): 'macd-above' | 'signal-above' | 'crossing' {
  const data = calcMACD(c).filter(x => x.signal !== null)
  if (!data.length) return 'crossing'
  const last    = data[data.length - 1]
  const diff    = last.macd - (last.signal ?? 0)
  const absMax  = Math.max(Math.abs(last.macd), Math.abs(last.signal ?? 0), 0.01)
  if (Math.abs(diff) / absMax < 0.10) return 'crossing'
  return diff > 0 ? 'macd-above' : 'signal-above'
}

/** bb-judgment: 'squeeze' | 'wide'
 *  정규화 밴드폭(= (upper−lower)/middle) 최근 5봉 평균 vs 이전 5봉 평균 비교 */
function scoreBBSqueeze(c: CandleData[]): 'squeeze' | 'wide' {
  if (c.length < 25) return 'wide'
  const { upper, lower, middle } = calcBollingerBands(c, 20, 2)
  if (upper.length < 10) return 'wide'
  const bw     = upper.map((u, i) => (u.value - lower[i].value) / (middle[i].value || 1))
  const n      = bw.length
  const recent = bw.slice(n - 5).reduce((a, b) => a + b, 0) / 5
  const prev   = bw.slice(n - 10, n - 5).reduce((a, b) => a + b, 0) / 5
  return recent < prev ? 'squeeze' : 'wide'
}

/** 단계 ID + 캔들 슬라이스 → 동적 정답 계산
 *  기초 튜토리얼 4개 judgment 단계에만 적용; 나머지는 undefined 반환 */
function computeCorrectValue(
  stepId:     string,
  allCandles: CandleData[],
  focusBars:  number | null,
): string | undefined {
  if (!allCandles.length) return undefined
  const c = focusBars ? allCandles.slice(-focusBars) : allCandles
  switch (stepId) {
    case 'ma-judgment':   return scoreTrend(c)
    case 'rsi-judgment':  return scoreRSI(c)
    case 'macd-judgment': return scoreMACDJudgment(c)
    case 'bb-judgment':   return scoreBBSqueeze(c)
    default:              return undefined
  }
}

interface TestQ {
  id: string; label: string; hint: string
  choices: { v: string; label: string }[]
  correct: string | null
  feedback: Record<string, string>
}

function buildTestQs(c: CandleData[]): TestQ[] {
  return [
    {
      id: 'trend', label: '현재 추세는?', hint: 'MA 선들의 방향을 봐요',
      correct: scoreTrend(c),
      choices: [
        { v: 'up', label: '상승' },
        { v: 'sideways', label: '횡보' },
        { v: 'down', label: '하락' },
      ],
      feedback: {
        up: 'MA선들이 함께 우상향 중이에요.', sideways: 'MA선들이 방향 없이 얽혀 있어요.', down: 'MA선들이 함께 우하향 중이에요.',
      },
    },
    {
      id: 'rsi', label: 'RSI 상태는?', hint: 'RSI 오른쪽 끝 값을 봐요',
      correct: scoreRSI(c),
      choices: [
        { v: 'overbought', label: '과열 (70+)' },
        { v: 'neutral', label: '중립' },
        { v: 'oversold', label: '침체 (30-)' },
      ],
      feedback: {
        overbought: 'RSI 65+ — 과매수 구간이에요.', neutral: 'RSI 중립 구간이에요.', oversold: 'RSI 35- — 과매도 구간이에요.',
      },
    },
    {
      id: 'macd', label: 'MACD 상태는?', hint: '파란선·주황선 위치를 봐요',
      correct: scoreMACDSignal(c),
      choices: [
        { v: 'bullish', label: '상승 모멘텀' },
        { v: 'bearish', label: '하락 모멘텀' },
      ],
      feedback: {
        bullish: 'MACD선이 시그널선 위에 있어요.', bearish: 'MACD선이 시그널선 아래에 있어요.',
      },
    },
    {
      id: 'prediction', label: '내 예측은?', hint: '정답 없음 — 자유롭게 판단해봐요',
      correct: null,
      choices: [
        { v: 'up', label: '상승' },
        { v: 'sideways', label: '횡보' },
        { v: 'down', label: '하락' },
      ],
      feedback: {
        up: '상승 예측! 실전 챌린지에서 확인해봐요.', sideways: '횡보 예측! 검증해봐요.', down: '하락 예측! 맞는지 확인해봐요.',
      },
    },
  ]
}

/* ── 레슨 키 → 짧은 topic 이름 (이벤트 공용) ────────────── */
const LESSON_TOPIC: Record<string, string> = {
  'fibonacci-advanced': 'fibonacci',
  'rsi-advanced':       'rsi',
  'macd-advanced':      'macd',
  'candle-learning':    'candlestick',
  'volume-learning':    'volume',
}

/* ══════════════════════════════════════════════════════════
   TutorialStep
══════════════════════════════════════════════════════════ */
export function TutorialStep() {
  const {
    currentStep, currentIndex, steps, isLesson, currentLessonKey,
    stepDone, candleData: clickedCandle, chosenJudgment,
    next, prev, skip, complete, completeLesson, notifyJudgment, markStepDone,
  } = useTutorialStore()
  const { activeIndicators, candleData: chartCandles, toggleIndicator } = useChartStore()

  const isMobile   = useMobile()
  const isMobileRef = useRef(isMobile)
  useEffect(() => { isMobileRef.current = isMobile }, [isMobile])

  /* ── 단계 진입 이벤트 ──────────────────────────────────────
     · 기초 튜토리얼 : tutorial_step_viewed  { tutorial, step }
     · 심화 학습     : advanced_step_viewed  { topic, step }
     currentStep.id 가 바뀔 때만 발송 (스텝 이동 감지)
  ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentStep) return
    if (isLesson && currentLessonKey) {
      /* 심화 학습 단계 진입 */
      const topic = LESSON_TOPIC[currentLessonKey] ?? currentLessonKey
      trackEvent('advanced_step_viewed', {
        topic,
        step:        currentIndex + 1,
        step_id:     currentStep.id,
        total_steps: steps.length,
      })
    } else {
      /* 기초 튜토리얼 단계 진입 */
      trackEvent('tutorial_step_viewed', {
        tutorial:        'basic',
        step:            currentIndex + 1,
        step_id:         currentStep.id,
        total_steps:     steps.length,
        action_required: currentStep.actionRequired ?? 'free',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.id])

  /* ── State ──────────────────────────────────────────── */
  const [hl,        setHl]        = useState<HL | null>(null)
  const [showCard,  setShowCard]  = useState(false)
  const [cardPos,   setCardPos]   = useState<CardPos | null>(null)
  const [cardSide,  setCardSide]  = useState<Side>('top')
  const [bodyOpen,  setBodyOpen]  = useState(false)   // 모바일 더보기

  const cardRef = useRef<HTMLDivElement>(null)
  const stepTmr = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef  = useRef<number>(0)

  const [testQIdx,       setTestQIdx]       = useState(0)
  const [testAnswers,    setTestAnswers]    = useState<Record<string,string>>({})
  const [testDone,       setTestDone]       = useState(false)
  const [wrongCount,     setWrongCount]     = useState(0)
  const [showWrongFB,    setShowWrongFB]    = useState(false)
  const [wrongChoice,    setWrongChoice]    = useState<string|null>(null)
  /** 기초 튜토리얼 judgment 단계: 실제 데이터로 계산한 동적 정답 */
  const [computedCorrect, setComputedCorrect] = useState<string | undefined>(undefined)

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

  /* ── 종합 테스트: 질문 인덱스별 spotlight 대상 매핑 ── */
  const COMPREHENSIVE_SELECTORS = ['#chart-area', '#rsi-chart', '#macd-chart', '#chart-area'] as const

  /* ── 대상 요소 selector ─────────────────────────────
     우선순위:
     1. comprehensive-test 진행 중 → 질문 인덱스별 매핑
     2. stepDone(피드백) → completionTargetSelector
     3. 모바일 → mobileTargetSelector
     4. 기본  → targetSelector
  ─────────────────────────────────────────────────── */
  const activeSelector = (() => {
    if (!currentStep) return undefined

    // 종합 테스트 진행 중(미완료) → 질문에 맞는 차트를 spotlight
    if (currentStep.actionRequired === 'comprehensive-test' && !testDone) {
      return COMPREHENSIVE_SELECTORS[testQIdx] ?? '#chart-area'
    }

    // 완료 후: completionTargetSelector 우선
    if (stepDone) {
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
    // 캔들/거래량 학습 중: 특정 캔들 뷰포트 박스를 spotlight 타깃으로 사용
    // (useChartStore.getState() 로 명령형 읽기 → computeHL 자체의 deps 불변 유지)
    const vBox = useChartStore.getState().highlightViewportBox
    if (vBox) {
      const P = PAD + 4  // spotlight cutout을 amber 박스보다 약간 크게
      const vh = window.innerHeight
      // 뷰포트 밖으로 나가면 null (캔들이 화면 밖으로 스크롤됨)
      if (vBox.bottom < 0 || vBox.top > vh) return null
      return {
        top:    vBox.top    - P,
        left:   vBox.left   - P,
        width:  vBox.width  + P * 2,
        height: vBox.height + P * 2,
        bottom: vBox.bottom + P,
        right:  vBox.right  + P,
      }
    }

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

    // 캔들 학습 중: 뷰포트 박스 기반으로 카드 자동 배치
    const vBox = useChartStore.getState().highlightViewportBox
    if (vBox) {
      if (hlRect) {
        const r = calcCardPos(hlRect, currentStep.position ?? 'top', cardW, cardH)
        setCardPos(r.pos); setCardSide(r.side)
      } else {
        // 캔들이 뷰포트 밖 → 카드를 상단 중앙에 배치
        setCardPos({ top: 72, left: Math.max(8, (vw - cardW) / 2) }); setCardSide('top')
      }
      return
    }

    if (!hlRect) {
      setCardPos({ top: 72, left: Math.max(8, (vw - cardW) / 2) }); setCardSide('top')
      return
    }
    const r = calcCardPos(hlRect, currentStep.position, cardW, cardH)
    setCardPos(r.pos); setCardSide(r.side)
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

    // 1차 스크롤: 즉시 (이미 렌더링된 요소 대상)
    smartScroll(currentStep, isMobileRef.current)
    stepTmr.current = setTimeout(() => {
      setShowCard(true)
      // 2차 스크롤: 카드 표시 후 최종 위치 보정 (RSI/MACD 서브차트가 이 시점에 확실히 렌더링)
      setTimeout(() => smartScroll(currentStep!, isMobileRef.current), 80)
    }, SCROLL_MS)
    return () => { if (stepTmr.current) clearTimeout(stepTmr.current) }
  }, [currentStep]) // eslint-disable-line

  /* ── 단계 완료 시 → completion target으로 스크롤 ────────────
     RSI/MACD 서브차트는 지표 활성화 직후 React가 렌더링하는데
     80ms 이내에 완료되지 않을 수 있음.
     → 200ms 초기 지연 + scrollToSel 내부 retry(5회×110ms=550ms) 로 보장.
  ────────────────────────────────────────────────────────────── */
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
    setTimeout(() => {
      scrollToSel(
        sel,
        { ...currentStep, targetSelector: sel, mobileTargetSelector: sel } as TStep,
        isMobileRef.current,
        5,   // 최대 재시도 5회
        110, // 110ms 간격
      )
    }, 200)  // 초기 대기 200ms (지표 차트 렌더링 시간)
  }, [stepDone]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 종합 테스트 질문 전환 시 → 해당 차트로 자동 스크롤 ─
     trend(0) → #chart-area / rsi(1) → #rsi-chart /
     macd(2)  → #macd-chart / prediction(3) → #chart-area
  ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (
      !currentStep ||
      currentStep.actionRequired !== 'comprehensive-test' ||
      testDone ||
      !showCard
    ) return
    const sel = COMPREHENSIVE_SELECTORS[testQIdx] ?? '#chart-area'
    // 260ms 전환 애니메이션 이후 스크롤 (testContent의 setTimeout 260ms와 맞춤)
    setTimeout(() => {
      scrollToSel(
        sel,
        { ...currentStep, targetSelector: sel, mobileTargetSelector: sel } as TStep,
        isMobileRef.current,
        4,
        110,
      )
    }, 120)
  }, [testQIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 카드 마운트 후 위치 계산 (PC) ──────────────────── */
  useEffect(() => {
    if (!showCard) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => recompute())
    })
    return () => cancelAnimationFrame(rafRef.current)
  }, [showCard, recompute])

  /* ── 캔들 뷰포트 박스 변경 시 카드 위치 재계산 ──────────────
     차트 팬/줌/스크롤로 highlightViewportBox 가 바뀌면
     플로팅 카드가 캔들 근처로 즉시 추적한다.
     recompute 는 ref 로 최신값을 유지하므로 deps 제외.
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!showCard) return
    let lastBox = useChartStore.getState().highlightViewportBox
    const unsub = useChartStore.subscribe((s) => {
      if (s.highlightViewportBox !== lastBox) {
        lastBox = s.highlightViewportBox
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => recompute())
      }
    })
    return () => {
      unsub()
      cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCard])

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

  /* ── judgment 단계 진입 시 → 실제 데이터로 정답 동적 계산 ──
     hardcoded correctValue가 없는 기초 튜토리얼 4개 단계 전용.
     chartCandles(NVDA 전체)에서 focusBarsFromEnd만큼 슬라이스해 채점.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (
      !currentStep ||
      currentStep.actionRequired !== 'judgment' ||
      currentStep.judgment?.correctValue !== undefined  // 정적 정답 있으면 스킵
    ) {
      setComputedCorrect(undefined)
      return
    }
    const cv = computeCorrectValue(
      currentStep.id,
      chartCandles,
      currentStep.focusBarsFromEnd ?? null,
    )
    setComputedCorrect(cv)
  }, [currentStep, chartCandles])

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
      {/* 스무스 채움 프로그레스 바 */}
      <div className="flex-1 h-[3px] bg-navi-border2 rounded-full overflow-hidden">
        <div
          className="h-full bg-navi-action rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-quiet-45 shrink-0">
        {currentIndex + 1}/{steps.length}
      </span>
      {/*  나가기 버튼 */}
      <button
        onClick={skip}
        aria-label="학습 나가기"
        className="ml-0.5 w-6 h-6 flex items-center justify-center rounded-full
                   bg-navi-surface3 border border-navi-border2
                   text-[11px] text-navi-muted
                   hover:bg-navi-surface2 hover:text-navi-text
                   transition-all active:scale-90"
      >
        
      </button>
    </div>
  )

  const pcDotRow = (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
      <div className="flex-1 flex items-center gap-2.5">
        <div className="flex-1 h-[3px] bg-navi-border2 rounded-full overflow-hidden">
          <div
            className="h-full bg-navi-action rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums shrink-0 text-quiet-45">
          {currentIndex + 1} / {steps.length}
        </span>
      </div>
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
            {activeMission}
          </p>
        </div>
      )}

      {/* indicator-toggle 단계: 아래 버튼이 하이라이트되어 있음 (spotlight) */}
    </div>
  )

  /* ── 판단 클릭 핸들러 ──────────────────────────────────
     effectiveCorrect = 정적 correctValue 우선, 없으면 동적 computedCorrect
     정답·오답 모두 tutorial_judgment_answered 로 기록
     → "어떤 문제를 가장 많이 틀리는가" 분석 가능
  ─────────────────────────────────────────────────────── */
  function handleJudgmentClick(value: string) {
    if (!currentStep?.judgment) return
    const effectiveCorrect = currentStep.judgment.correctValue ?? computedCorrect
    if (effectiveCorrect !== undefined) {
      const isCorrect = value === effectiveCorrect

      /*  모든 선택(정답·오답 불문) 기록 */
      trackEvent('tutorial_judgment_answered', {
        tutorial:   isLesson && currentLessonKey
                      ? (LESSON_TOPIC[currentLessonKey] ?? 'lesson')
                      : 'basic',
        step_id:    currentStep.id,
        step:       currentIndex + 1,
        chosen:     value,
        is_correct: isCorrect,
      })

      if (isCorrect) {
        setWrongCount(0); setShowWrongFB(false); setWrongChoice(null)
        notifyJudgment(value)
      } else {
        setWrongCount(c => c + 1); setWrongChoice(value); setShowWrongFB(true)
      }
    } else {
      // 정답을 알 수 없는 경우(데이터 부족 등) → 어느 선택도 허용
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
              <p className="text-[12px] font-semibold text-navi-text mb-1"> 다시 살펴보세요</p>
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
                onClick={() => {
                  const answer = currentStep.judgment!.correctValue ?? computedCorrect
                  if (answer) { notifyJudgment(answer); setShowWrongFB(false) }
                }}
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
        const chosen          = currentStep.judgment!.choices.find(c => c.value === chosenJudgment)
        const effectiveCorrect = currentStep.judgment!.correctValue ?? computedCorrect
        const isCorrect        = effectiveCorrect !== undefined && chosenJudgment === effectiveCorrect
        return chosen ? (
          <div className={clsx(
            'rounded-lg p-3',
            isCorrect ? 'bg-navi-success/[0.07] border border-navi-success/25'
                      : 'bg-navi-info/[0.07] border border-navi-info/25'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              {isCorrect && <span className="text-[11px] font-bold text-navi-success"></span>}
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
             {currentStep.completionMessage}
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
                  <span>{ok ? '' : ''}</span>
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

                /*  종합 테스트 문항 답변 기록
                   q.correct === null 인 prediction 질문은 is_correct: null */
                trackEvent('comprehensive_test_answered', {
                  question_index: testQIdx,
                  question_id:    q.id,
                  chosen:         c.v,
                  is_correct:     q.correct !== null ? c.v === q.correct : null,
                })

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
              <span className="text-[12px] font-semibold text-navi-text text-center leading-tight px-0.5">
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
              {/* 카드 → 하이라이트 연결 화살표 (PC, highlight 있을 때만) */}
              {hl && cardPos && (() => {
                const S   = 7   // 화살표 반폭 (전체 폭 14px, 높이 7px)
                const cW  = getCardW()
                const cH  = cardRef.current?.offsetHeight ?? 0
                if (cH === 0) return null
                const hlCx  = hl.left + hl.width  / 2
                const hlCy  = hl.top  + hl.height / 2
                const BD    = 'rgb(var(--navi-border))'
                const BG    = 'rgb(var(--navi-surface))'
                const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0 }

                if (cardSide === 'top') {
                  const ax = Math.max(16, Math.min(hlCx - cardPos.left - S, cW - 32))
                  return (
                    <>
                      <div style={{ ...base, bottom: -S, left: ax, borderLeft: `${S}px solid transparent`, borderRight: `${S}px solid transparent`, borderTop: `${S}px solid ${BD}` }} />
                      <div style={{ ...base, bottom: -(S-1), left: ax+1, borderLeft: `${S-1}px solid transparent`, borderRight: `${S-1}px solid transparent`, borderTop: `${S-1}px solid ${BG}` }} />
                    </>
                  )
                }
                if (cardSide === 'bottom') {
                  const ax = Math.max(16, Math.min(hlCx - cardPos.left - S, cW - 32))
                  return (
                    <>
                      <div style={{ ...base, top: -S, left: ax, borderLeft: `${S}px solid transparent`, borderRight: `${S}px solid transparent`, borderBottom: `${S}px solid ${BD}` }} />
                      <div style={{ ...base, top: -(S-1), left: ax+1, borderLeft: `${S-1}px solid transparent`, borderRight: `${S-1}px solid transparent`, borderBottom: `${S-1}px solid ${BG}` }} />
                    </>
                  )
                }
                if (cardSide === 'right') {
                  const ay = Math.max(16, Math.min(hlCy - cardPos.top - S, cH - 32))
                  return (
                    <>
                      <div style={{ ...base, left: -S, top: ay, borderTop: `${S}px solid transparent`, borderBottom: `${S}px solid transparent`, borderRight: `${S}px solid ${BD}` }} />
                      <div style={{ ...base, left: -(S-1), top: ay+1, borderTop: `${S-1}px solid transparent`, borderBottom: `${S-1}px solid transparent`, borderRight: `${S-1}px solid ${BG}` }} />
                    </>
                  )
                }
                if (cardSide === 'left') {
                  const ay = Math.max(16, Math.min(hlCy - cardPos.top - S, cH - 32))
                  return (
                    <>
                      <div style={{ ...base, right: -S, top: ay, borderTop: `${S}px solid transparent`, borderBottom: `${S}px solid transparent`, borderLeft: `${S}px solid ${BD}` }} />
                      <div style={{ ...base, right: -(S-1), top: ay+1, borderTop: `${S-1}px solid transparent`, borderBottom: `${S-1}px solid transparent`, borderLeft: `${S-1}px solid ${BG}` }} />
                    </>
                  )
                }
                return null
              })()}

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
