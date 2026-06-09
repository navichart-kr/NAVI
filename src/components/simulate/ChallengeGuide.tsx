'use client'

/**
 * 실전 챌린지 가이드
 * — 기초 튜토리얼과 동일한 Spotlight + Floating Card 방식
 * — localStorage로 완료 여부 저장 (?guide=1 로 재표시 가능)
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

/* ── 상수 ───────────────────────────────────────────────── */
const STORAGE_KEY  = 'navi-challenge-guide-seen'
const PAD          = 6
const CARD_W       = 300
const CARD_MARGIN  = 14
const SCROLL_MS    = 200

/* ── 타입 ───────────────────────────────────────────────── */
interface GuideStep {
  targetSelector: string | null
  position:       'top' | 'bottom' | 'left' | 'right'
  title:          string
  body:           string
}

interface HL { top:number; left:number; width:number; height:number; bottom:number; right:number }
interface Pos { top:number; left:number }

/* ── 가이드 단계 정의 ────────────────────────────────────── */
const GUIDE_STEPS: GuideStep[] = [
  {
    targetSelector: '#challenge-chart',
    position:       'bottom',
    title:          '분석 구간',
    body:           '약 16개월 실제 과거 데이터예요.\n상단 탭에서 MSFT·NVDA·TSLA·AAPL 종목을 선택할 수 있어요.\n노란 점선 이후 30일은 숨겨져 있어요. 이 구간을 분석하고 예측해봐요.',
  },
  {
    targetSelector: '#challenge-analysis-panel',
    position:       'top',
    title:          '분석 도구',
    body:           'MA, RSI, MACD, BB를 켜서 차트를 분석해봐요.\n여러 지표가 같은 방향을 가리킬수록 예측이 확실해져요.',
  },
  {
    targetSelector: '#challenge-drawing-panel',
    position:       'top',
    title:          '작도 도구',
    body:           '추세선과 피보나치를 직접 그려봐요.\n차트에 선을 그으며 방향을 파악해봐요.',
  },
  {
    targetSelector: '#challenge-predict-btn',
    position:       'top',
    title:          '예측하기',
    body:           '분석이 끝나면 이 버튼을 눌러봐요.\n상승·횡보·하락 중 하나를 예측하고 결과를 확인해봐요.',
  },
  {
    targetSelector: null,
    position:       'bottom',
    title:          '이제 직접 해봐요',
    body:           '분석하고, 예측하고, 결과를 확인해봐요.\n처음엔 틀려도 완전히 괜찮아요!',
  },
]

/* ── Spotlight 유틸 ─────────────────────────────────────── */
function mkHL(el: Element): HL {
  const r = el.getBoundingClientRect()
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2, bottom: r.bottom + PAD, right: r.right + PAD }
}

function calcCardPos(hl: HL, pref: string, cW: number, cH: number): Pos {
  const vw = window.innerWidth, vh = window.innerHeight
  const cx = hl.left + hl.width / 2, cy = hl.top + hl.height / 2
  const clL = (x: number) => Math.max(8, Math.min(x, vw - cW - 8))
  const clT = (y: number) => Math.max(56, Math.min(y, vh - cH - 8))
  const M = CARD_MARGIN
  const v: Record<string, Pos> = {
    top:    { top: hl.top  - cH - M,  left: clL(cx - cW / 2) },
    bottom: { top: hl.bottom + M,      left: clL(cx - cW / 2) },
    right:  { top: clT(cy - cH / 2),  left: hl.right + M      },
    left:   { top: clT(cy - cH / 2),  left: hl.left - cW - M  },
  }
  const order = [pref, 'top', 'right', 'left', 'bottom'].filter((x, i, a) => a.indexOf(x) === i)
  for (const p of order) {
    const c = v[p]; if (!c) continue
    if (c.top >= 56 && c.top + cH <= vh - 8 && c.left >= 8 && c.left + cW <= vw - 8) return c
  }
  const fb = v[pref] ?? v.bottom
  return { top: Math.max(56, Math.min(fb.top, vh - cH - 8)), left: Math.max(8, Math.min(fb.left, vw - cW - 8)) }
}

/* ── Props ──────────────────────────────────────────────── */
interface Props { forceGuide?: boolean }

/* ════════════════════════════════════════════════════════ */
export function ChallengeGuide({ forceGuide = false }: Props) {
  const [show,     setShow]     = useState(false)
  const [idx,      setIdx]      = useState(0)
  const [hl,       setHl]       = useState<HL | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [cardPos,  setCardPos]  = useState<Pos | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const tmrRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef  = useRef<number>(0)

  const step = GUIDE_STEPS[idx]

  /* 완료 저장 + 닫기 */
  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }, [])

  /* 최초 표시 여부 결정 */
  useEffect(() => {
    const seen = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!seen || forceGuide) setShow(true)
  }, [forceGuide])

  /* ── 카드 위치 계산 ─────────────────────────────────── */
  const recompute = useCallback(() => {
    if (!showCard || !cardRef.current) return
    const cH = cardRef.current.offsetHeight
    if (cH === 0) return

    if (!step.targetSelector) {
      setHl(null)
      setCardPos({ top: Math.max(80, (window.innerHeight - cH) / 2), left: Math.max(8, (window.innerWidth - CARD_W) / 2) })
      return
    }
    const el = document.querySelector(step.targetSelector)
    if (!el) {
      setHl(null)
      setCardPos({ top: 80, left: Math.max(8, (window.innerWidth - CARD_W) / 2) })
      return
    }
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setHl(null)
      setCardPos({ top: 80, left: Math.max(8, (window.innerWidth - CARD_W) / 2) })
      return
    }
    const hlRect = mkHL(el)
    setHl(hlRect)
    setCardPos(calcCardPos(hlRect, step.position, CARD_W, cH))
  }, [showCard, step])

  /* 단계 변경 시 스크롤 + 카드 표시 */
  useEffect(() => {
    if (!show) return
    if (tmrRef.current) clearTimeout(tmrRef.current)
    cancelAnimationFrame(rafRef.current)
    setShowCard(false); setHl(null); setCardPos(null)

    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.bottom > window.innerHeight - 80) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    tmrRef.current = setTimeout(() => setShowCard(true), SCROLL_MS)
    return () => { if (tmrRef.current) clearTimeout(tmrRef.current) }
  }, [idx, show, step])

  /* 카드 마운트 후 위치 계산 */
  useEffect(() => {
    if (!showCard) return
    rafRef.current = requestAnimationFrame(() => { rafRef.current = requestAnimationFrame(() => recompute()) })
    return () => cancelAnimationFrame(rafRef.current)
  }, [showCard, recompute])

  /* ResizeObserver */
  useEffect(() => {
    if (!cardRef.current || !showCard) return
    const obs = new ResizeObserver(() => recompute())
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [showCard, recompute])

  /* scroll / resize */
  useEffect(() => {
    const h = () => recompute()
    window.addEventListener('scroll', h, { passive: true })
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h); window.removeEventListener('resize', h) }
  }, [recompute])

  if (!show) return null

  const isLast = idx === GUIDE_STEPS.length - 1

  return (
    <>
      {/* ── 딤 오버레이 (spotlight cutout) ─────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 44, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.54)',
          ...(hl ? {
            clipPath: `polygon(evenodd, 0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, ${hl.left}px ${hl.top}px, ${hl.right}px ${hl.top}px, ${hl.right}px ${hl.bottom}px, ${hl.left}px ${hl.bottom}px, ${hl.left}px ${hl.top}px)`
          } : {}),
        }}
      />

      {/* ── Spotlight 링 ────────────────────────────────── */}
      {hl && (
        <div
          style={{
            position: 'fixed', top: hl.top, left: hl.left, width: hl.width, height: hl.height,
            zIndex: 45, pointerEvents: 'none', borderRadius: 10,
            boxShadow: '0 0 0 1.5px #2D4198, 0 0 0 5px rgba(45,65,152,0.25), 0 0 28px rgba(45,65,152,0.45)',
          }}
        />
      )}

      {/* ── Floating Card ────────────────────────────────── */}
      {showCard && (
        <div
          ref={cardRef}
          style={{ position: 'fixed', width: CARD_W, top: cardPos?.top ?? -9999, left: cardPos?.left ?? -9999, zIndex: 50, maxWidth: 'calc(100vw - 16px)' }}
        >
          <motion.div
            key={`cg-${idx}`}
            initial={{ opacity: 0, scale: 0.93, y: 10 }}
            animate={{ opacity: cardPos ? 1 : 0, scale: cardPos ? 1 : 0.93, y: cardPos ? 0 : 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-navi-surface border border-navi-border rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.55)] overflow-hidden"
          >
            {/* 진행 도트 */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <div className="flex gap-[3px]">
                {GUIDE_STEPS.map((_, i) => (
                  <div key={i} className={clsx('rounded-full transition-all duration-300',
                    i < idx   ? 'w-[5px] h-[5px] bg-navi-action/60' :
                    i === idx ? 'w-2 h-2 bg-navi-action' :
                    'w-[5px] h-[5px] bg-navi-border2'
                  )} />
                ))}
              </div>
              <span className="text-[10px] tabular-nums text-quiet-45">
                {idx + 1} / {GUIDE_STEPS.length}
              </span>
            </div>

            {/* 콘텐츠 */}
            <div className="px-4 py-3.5 space-y-2">
              <p className="text-[14px] font-bold text-navi-text leading-snug">{step.title}</p>
              <p className="text-[12px] font-medium text-navi-secondary leading-relaxed whitespace-pre-line">{step.body}</p>
            </div>

            {/* 네비 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-navi-border/40">
              <button onClick={dismiss} className="text-[10px] text-navi-secondary hover:text-navi-text transition-colors">
                건너뛰기
              </button>
              <div className="flex gap-1.5 items-center">
                {idx > 0 && (
                  <button
                    onClick={() => setIdx(i => i - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] text-navi-muted border border-navi-border2 hover:text-navi-text hover:border-navi-border transition"
                  >←</button>
                )}
                {!isLast ? (
                  <button
                    onClick={() => setIdx(i => i + 1)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.3)] transition-all"
                  >다음 →</button>
                ) : (
                  <button
                    onClick={dismiss}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navi-action text-white hover:bg-navi-action-hover active:scale-95 shadow-[0_2px_12px_rgba(91,127,255,0.35)] transition"
                  >시작하기</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
