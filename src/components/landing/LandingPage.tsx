'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  motion, useScroll, useTransform, useMotionValueEvent,
  type MotionValue,
} from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import {
  DEMO_CANDLES, calcDemoMA, calcDemoRSI, calcDemoMACD,
  CHART_W, CANDLE_H, SUB_H,
  barX, barW, priceY, subY, MA_COLORS,
} from './demoData'

// ─────────────────────────────────────────────────────────────────────────────
// 색상 팔레트 (고정 dark)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#101936',
  bgDeep:   '#0a1229',
  grid:     '#1B2847',
  up:       '#26a69a',
  dn:       '#ef5350',
  rsiLine:  '#38BDF8',
  rsi70:    '#F472B6',
  rsi30:    '#34D399',
  macdLine: '#38BDF8',
  sigLine:  '#F472B6',
  histPos:  '#34D399',
  histNeg:  '#F87171',
  text:     'rgba(248,249,247,0.50)',
  action:   '#5B7FFF',
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG 레이어
// ─────────────────────────────────────────────────────────────────────────────

function DemoCandles() {
  const bw = barW()
  return (
    <g>
      {DEMO_CANDLES.map((c, i) => {
        const isUp  = c.c >= c.o
        const fill  = isUp ? C.up : C.dn
        const bodyTop = priceY(Math.max(c.o, c.c))
        const bodyH   = Math.max(1, Math.abs(priceY(c.o) - priceY(c.c)))
        return (
          <g key={i}>
            <line x1={barX(i)} y1={priceY(c.h)} x2={barX(i)} y2={priceY(c.l)}
                  stroke={fill} strokeWidth={1} />
            <rect x={barX(i) - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={fill} />
          </g>
        )
      })}
    </g>
  )
}

function DemoMALines() {
  const periods = [5, 20, 60] as const
  return (
    <g>
      {periods.map(p => {
        const ma  = calcDemoMA(DEMO_CANDLES, p)
        const pts = ma
          .map((v, i) => (v === null ? null : `${barX(i)},${priceY(v)}`))
          .filter(Boolean)
          .join(' ')
        if (!pts) return null
        return (
          <polyline key={p} points={pts} fill="none"
                    stroke={MA_COLORS[p]} strokeWidth={1.5}
                    strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        )
      })}
    </g>
  )
}

function DemoRSIPanel() {
  const rsi  = calcDemoRSI(DEMO_CANDLES, 14)
  const vMin = 0, vMax = 100
  const pts  = rsi
    .map((v, i) => (v === null ? null : `${barX(i)},${subY(v, vMin, vMax)}`))
    .filter(Boolean)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${CHART_W} ${SUB_H}`} preserveAspectRatio="none" className="w-full h-full">
      <rect width={CHART_W} height={SUB_H} fill={C.bg} />
      <line x1={0} y1={subY(70, vMin, vMax)} x2={CHART_W} y2={subY(70, vMin, vMax)}
            stroke={C.rsi70} strokeWidth={0.8} strokeDasharray="4 3" opacity={0.7} />
      <line x1={0} y1={subY(30, vMin, vMax)} x2={CHART_W} y2={subY(30, vMin, vMax)}
            stroke={C.rsi30} strokeWidth={0.8} strokeDasharray="4 3" opacity={0.7} />
      <line x1={0} y1={subY(50, vMin, vMax)} x2={CHART_W} y2={subY(50, vMin, vMax)}
            stroke={C.grid} strokeWidth={0.6} opacity={0.5} />
      {pts && (
        <polyline points={pts} fill="none"
                  stroke={C.rsiLine} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <text x={8} y={subY(70, vMin, vMax) - 2} fill={C.rsi70} fontSize={9} opacity={0.8}>70</text>
      <text x={8} y={subY(30, vMin, vMax) - 2} fill={C.rsi30} fontSize={9} opacity={0.8}>30</text>
      <text x={8} y={10} fill={C.text} fontSize={9}>RSI(14)</text>
    </svg>
  )
}

function DemoMACDPanel() {
  const macd    = calcDemoMACD(DEMO_CANDLES)
  const allVals = macd.flatMap(d => [d.macd, d.signal ?? d.macd, d.hist ?? d.macd])
  const vMin    = Math.min(...allVals) * 1.15
  const vMax    = Math.max(...allVals) * 1.15
  const bw      = barW()

  const macdPts = macd.map((d, i) => `${barX(i)},${subY(d.macd, vMin, vMax)}`).join(' ')
  const sigPts  = macd
    .map((d, i) => d.signal !== null ? `${barX(i)},${subY(d.signal, vMin, vMax)}` : null)
    .filter(Boolean)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${CHART_W} ${SUB_H}`} preserveAspectRatio="none" className="w-full h-full">
      <rect width={CHART_W} height={SUB_H} fill={C.bg} />
      <line x1={0} y1={subY(0, vMin, vMax)} x2={CHART_W} y2={subY(0, vMin, vMax)}
            stroke={C.grid} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.6} />
      {macd.map((d, i) => {
        if (d.hist === null) return null
        const topY = subY(Math.max(d.hist, 0), vMin, vMax)
        const botY = subY(Math.min(d.hist, 0), vMin, vMax)
        return (
          <rect key={i} x={barX(i) - bw / 2} y={topY}
                width={bw} height={Math.max(1, botY - topY)}
                fill={d.hist >= 0 ? C.histPos : C.histNeg} opacity={0.75} />
        )
      })}
      <polyline points={macdPts} fill="none"
                stroke={C.macdLine} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {sigPts && (
        <polyline points={sigPts} fill="none"
                  stroke={C.sigLine} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <text x={8} y={10} fill={C.text} fontSize={9}>MACD</text>
    </svg>
  )
}

function DemoMainChart({ showMA }: { showMA: boolean }) {
  return (
    <svg viewBox={`0 0 ${CHART_W} ${CANDLE_H}`} preserveAspectRatio="none" className="w-full h-full">
      <rect width={CHART_W} height={CANDLE_H} fill={C.bg} />
      {[0.2, 0.4, 0.6, 0.8].map(r => (
        <line key={r} x1={0} y1={CANDLE_H * r} x2={CHART_W} y2={CANDLE_H * r}
              stroke={C.grid} strokeWidth={0.6} opacity={0.5} />
      ))}
      <DemoCandles />
      {showMA && <DemoMALines />}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVI 툴바 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

function NaviToolbar({ showMA, showRSI, showMACD }: { showMA: boolean; showRSI: boolean; showMACD: boolean }) {
  const btns = [
    { label: 'MA',   active: showMA   },
    { label: 'RSI',  active: showRSI  },
    { label: 'MACD', active: showMACD },
    { label: 'BB',   active: false    },
  ]
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-[#1B2847]"
         style={{ background: '#0d1730' }}>
      <svg viewBox="0 0 512 512" className="w-4 h-4 shrink-0" fill={C.action}>
        <polygon points="80.16 102.53 126.02 270.96 189.14 313.31 164.69 320.95 116.56 391.34 207.69 357.28 231.76 327.41 242.66 238.7 225.8 195.38 80.16 102.53" />
        <polygon points="257.02 264.74 251.7 329.74 383.16 285.1 466.23 139.6 314.84 187.55 257.02 264.74" />
        <polygon points="298.84 319.45 258.2 339.75 266.68 371.84 321.09 405.58 339.5 383.89 340.21 332.96 298.84 319.45" />
      </svg>
      <span className="text-[11px] font-bold text-[rgba(248,249,247,0.85)] mr-2">NVDA</span>
      <div className="flex-1" />
      {btns.map(b => (
        <div key={b.label}
             className="h-6 px-2.5 rounded-md text-[10px] font-semibold flex items-center transition-all duration-300"
             style={{
               background:   b.active ? C.action : '#162142',
               color:        b.active ? '#fff'    : 'rgba(248,249,247,0.5)',
               border:       `1px solid ${b.active ? C.action : '#1B2847'}`,
             }}>
          {b.label}
        </div>
      ))}
      <div className="ml-1 flex gap-1">
        {['1D', '1W', '1M'].map((p, pi) => (
          <div key={p} className="h-6 px-2 rounded-md text-[10px] flex items-center"
               style={{ background: pi === 0 ? '#1B2B55' : 'transparent',
                        color: pi === 0 ? 'rgba(248,249,247,0.8)' : 'rgba(248,249,247,0.35)' }}>
            {p}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 튜토리얼 오버레이
// ─────────────────────────────────────────────────────────────────────────────

function TutorialOverlay() {
  const idx    = 44
  const candle = DEMO_CANDLES[idx]
  const cxPct  = (barX(idx) / CHART_W * 100).toFixed(2)

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0" style={{ background: 'rgba(3,6,23,0.62)' }} />
      {/* 하이라이트 열 */}
      <div className="absolute top-0 h-full"
           style={{
             left:    `calc(${cxPct}% - 4%)`,
             width:   '8%',
             background:  'rgba(91,127,255,0.10)',
             borderLeft:  '1px solid rgba(91,127,255,0.35)',
             borderRight: '1px solid rgba(91,127,255,0.35)',
           }} />
      {/* 플로팅 카드 */}
      <div className="absolute rounded-2xl p-3"
           style={{
             left:        '54%',
             top:         '7%',
             width:       '40%',
             background:  '#101936',
             border:      '1px solid rgba(91,127,255,0.38)',
             boxShadow:   '0 8px 32px rgba(0,0,0,0.5)',
           }}>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.action }} />
          <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: 'rgba(248,249,247,0.45)' }}>
            튜토리얼 4 / 16
          </span>
        </div>
        <p className="text-[11px] font-semibold leading-snug mb-3"
           style={{ color: 'rgba(248,249,247,0.92)' }}>
          이동평균선이 캔들 아래에 있으면<br />
          상승 추세 신호예요.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1B2847' }}>
            <div className="h-full rounded-full" style={{ width: '25%', background: C.action }} />
          </div>
          <div className="h-6 px-3 rounded-lg text-[10px] font-bold flex items-center"
               style={{ background: C.action, color: '#fff' }}>
            다음
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 챌린지 오버레이
// ─────────────────────────────────────────────────────────────────────────────

function ChallengeOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4">
      <div className="absolute top-0 right-0 h-full"
           style={{
             width:      '22%',
             background: 'repeating-linear-gradient(45deg, rgba(27,40,71,0.65) 0px, rgba(27,40,71,0.65) 4px, transparent 4px, transparent 10px)',
             borderLeft: '1px dashed rgba(255,184,77,0.5)',
           }} />
      <div className="relative flex gap-2">
        {[
          { label: '상승', color: '#26a69a', bg: 'rgba(38,166,154,0.15)' },
          { label: '하락', color: '#ef5350', bg: 'rgba(239,83,80,0.15)'  },
          { label: '횡보', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
        ].map(opt => (
          <div key={opt.label}
               className="rounded-xl text-[11px] font-bold px-4 py-2"
               style={{
                 color:       opt.color,
                 background:  opt.bg,
                 border:      `1px solid ${opt.color}55`,
               }}>
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 브라우저 목업
// ─────────────────────────────────────────────────────────────────────────────

interface BrowserProps {
  showMA: boolean; showRSI: boolean; showMACD: boolean
  showTutorial: boolean; showChallenge: boolean
}

function BrowserMockup({ showMA, showRSI, showMACD, showTutorial, showChallenge }: BrowserProps) {
  const hasSub = showRSI || showMACD
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: C.bg }}>
      {/* URL 바 */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[#1B2847]"
           style={{ background: C.bgDeep }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 h-5 rounded-md text-[9px] flex items-center"
               style={{
                 border:     '1px solid #1B2847',
                 background: '#101936',
                 color:      'rgba(248,249,247,0.4)',
                 minWidth:   110,
               }}>
            navichart.co.kr
          </div>
        </div>
      </div>

      {/* 툴바 */}
      <NaviToolbar showMA={showMA} showRSI={showRSI} showMACD={showMACD} />

      {/* 차트 영역 */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="relative" style={{ flex: hasSub ? 6 : 1, minHeight: 0 }}>
          <DemoMainChart showMA={showMA} />
          {showTutorial  && <TutorialOverlay />}
          {showChallenge && <ChallengeOverlay />}
        </div>
        {showRSI && (
          <div className="shrink-0 border-t border-[#1B2847]" style={{ height: '22%' }}>
            <DemoRSIPanel />
          </div>
        )}
        {showMACD && (
          <div className="shrink-0 border-t border-[#1B2847]" style={{ height: '22%' }}>
            <DemoMACDPanel />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MotionValue<boolean> -> React state 브리지
// ─────────────────────────────────────────────────────────────────────────────

function BrowserBridge({
  mvMA, mvRSI, mvMACD, mvTutorial, mvChallenge,
}: {
  mvMA: MotionValue<boolean>; mvRSI: MotionValue<boolean>; mvMACD: MotionValue<boolean>
  mvTutorial: MotionValue<boolean>; mvChallenge: MotionValue<boolean>
}) {
  const [showMA,        setShowMA]       = useState(false)
  const [showRSI,       setShowRSI]      = useState(false)
  const [showMACD,      setShowMACD]     = useState(false)
  const [showTutorial,  setShowTutorial] = useState(false)
  const [showChallenge, setShowChallenge]= useState(false)

  useMotionValueEvent(mvMA,        'change', setShowMA)
  useMotionValueEvent(mvRSI,       'change', setShowRSI)
  useMotionValueEvent(mvMACD,      'change', setShowMACD)
  useMotionValueEvent(mvTutorial,  'change', setShowTutorial)
  useMotionValueEvent(mvChallenge, 'change', setShowChallenge)

  return (
    <BrowserMockup
      showMA={showMA} showRSI={showRSI} showMACD={showMACD}
      showTutorial={showTutorial} showChallenge={showChallenge}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 랜딩 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
/*
  스크롤 구간 매핑 (620vh 컨테이너):
  0.00 – 0.14  Hero: NAVI 로고
  0.14 – 0.30  캔들 등장
  0.30 – 0.47  이동평균선
  0.47 – 0.62  RSI 패널
  0.62 – 0.76  MACD 패널
  0.76 – 0.87  튜토리얼 카드
  0.87 – 1.00  챌린지 + 확대
*/

export function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ['start start', 'end end'],
  })

  // Hero 페이드
  const heroOpacity = useTransform(scrollYProgress, [0, 0.04, 0.10, 0.16], [1, 1, 0.7, 0])

  // 차트 영역 페이드인
  const chartOpacity = useTransform(scrollYProgress, [0.12, 0.20], [0, 1])

  // 각 스텝 레이블 (외부 텍스트)
  const lbCandle   = useTransform(scrollYProgress, [0.14, 0.20, 0.28, 0.33], [0, 1, 1, 0])
  const lbMA       = useTransform(scrollYProgress, [0.33, 0.39, 0.44, 0.49], [0, 1, 1, 0])
  const lbRSI      = useTransform(scrollYProgress, [0.49, 0.55, 0.60, 0.64], [0, 1, 1, 0])
  const lbMACD     = useTransform(scrollYProgress, [0.64, 0.70, 0.74, 0.79], [0, 1, 1, 0])
  const lbTutorial = useTransform(scrollYProgress, [0.79, 0.84, 0.87, 0.90], [0, 1, 1, 0])
  const lbChallenge= useTransform(scrollYProgress, [0.90, 0.95], [0, 1])
  const scrollHint = useTransform(scrollYProgress, [0, 0.05], [1, 0])

  // 브라우저 내부 요소 표시 여부 (boolean MotionValue)
  const mvMA        = useTransform(scrollYProgress, v => v >= 0.30)
  const mvRSI       = useTransform(scrollYProgress, v => v >= 0.47)
  const mvMACD      = useTransform(scrollYProgress, v => v >= 0.62)
  const mvTutorial  = useTransform(scrollYProgress, v => v >= 0.76 && v < 0.88)
  const mvChallenge = useTransform(scrollYProgress, v => v >= 0.87)

  // Section 5: 확대
  const browserScale  = useTransform(scrollYProgress, [0.87, 1.00], [1, 1.28])
  const browserRadius = useTransform(scrollYProgress, [0.87, 1.00], [16, 2])
  const chromeAlpha   = useTransform(scrollYProgress, [0.87, 0.96], [1, 0])

  const labels = [
    { opacity: lbCandle,    title: '캔들',       sub: '가격 흐름을 한눈에' },
    { opacity: lbMA,        title: '이동평균선', sub: '추세를 읽는 가장 기본적인 도구' },
    { opacity: lbRSI,       title: 'RSI',        sub: '과매수 · 과매도 구간 식별' },
    { opacity: lbMACD,      title: 'MACD',       sub: '모멘텀 방향과 강도' },
    { opacity: lbTutorial,  title: '단계별 튜토리얼', sub: '직접 보며, 직접 배워요' },
    { opacity: lbChallenge, title: '실전 챌린지', sub: '이 차트, 다음에 어떻게 됐을까요?' },
  ]

  return (
    <main style={{ background: '#030617' }}>
      {/* ─ 스크롤 드리븐 컨테이너 ─ */}
      <div ref={scrollRef} style={{ height: '620vh' }} className="relative">
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">

          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 38%, rgba(45,65,152,0.16) 0%, transparent 68%)' }} />

          {/* Hero 텍스트 */}
          <motion.div
            style={{ opacity: heroOpacity }}
            className="absolute top-[10%] left-0 right-0 flex flex-col items-center gap-3 pointer-events-none select-none"
          >
            <p className="text-[11px] tracking-[0.24em] uppercase font-semibold"
               style={{ color: 'rgba(248,249,247,0.38)' }}>
              NAVIchart
            </p>
            <h1 className="text-[30px] sm:text-[40px] font-black tracking-[-0.03em] text-center leading-[1.15]"
                style={{ color: 'rgba(248,249,247,0.92)' }}>
              Learn.<br />Observe.<br />Predict.
            </h1>
          </motion.div>

          {/* 브라우저 목업 */}
          <motion.div
            style={{ scale: browserScale }}
            className="relative z-20"
          >
            {/* 외부 그림자 + 테두리 */}
            <motion.div
              style={{
                borderRadius: browserRadius,
                boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(27,40,71,0.9)',
                overflow: 'hidden',
                width:  'clamp(290px, 70vw, 800px)',
                height: 'clamp(200px, 46vw, 530px)',
                border: '1px solid #1B2847',
              }}
            >
              {/* Hero 상태: 로고만 */}
              <motion.div
                style={{ opacity: heroOpacity }}
                className="absolute inset-0 flex items-center justify-center z-30"
              >
                <div className="absolute inset-0" style={{ background: '#101936' }} />
                <img src="/navi-logo.svg" alt="NAVIchart"
                     className="relative w-40 sm:w-56 select-none" draggable={false} />
              </motion.div>

              {/* 차트 상태 */}
              <motion.div
                style={{ opacity: chartOpacity }}
                className="absolute inset-0 z-20"
              >
                <motion.div style={{ opacity: chromeAlpha }} className="w-full h-full">
                  <BrowserBridge
                    mvMA={mvMA} mvRSI={mvRSI} mvMACD={mvMACD}
                    mvTutorial={mvTutorial} mvChallenge={mvChallenge}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 스텝 레이블 (하단 중앙) */}
          <div className="absolute bottom-[9%] left-0 right-0 flex justify-center pointer-events-none select-none">
            {/* 스크롤 힌트 */}
            <motion.div style={{ opacity: scrollHint }}
                        className="absolute flex flex-col items-center gap-2">
              <p className="text-[11px]" style={{ color: 'rgba(248,249,247,0.40)' }}>스크롤하면 시작돼요</p>
              <motion.div animate={{ y: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
                <div className="w-px h-6"
                     style={{ background: 'linear-gradient(to bottom, rgba(91,127,255,0.7), transparent)' }} />
              </motion.div>
            </motion.div>

            {/* 각 단계 레이블 */}
            {labels.map(({ opacity, title, sub }) => (
              <motion.div key={title} style={{ opacity }} className="absolute text-center">
                <p className="text-[13px] font-semibold"
                   style={{ color: 'rgba(248,249,247,0.75)' }}>{title}</p>
                <p className="text-[11px] mt-0.5"
                   style={{ color: 'rgba(248,249,247,0.38)' }}>{sub}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* ─ Final CTA ─ */}
      <section className="h-screen flex flex-col items-center justify-center gap-0 px-6 relative">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(45,65,152,0.18) 0%, transparent 68%)' }} />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center">
          <p className="text-[11px] tracking-[0.24em] uppercase font-semibold"
             style={{ color: 'rgba(248,249,247,0.35)' }}>
            NAVIchart
          </p>
          <h2 className="text-[26px] sm:text-[34px] font-black tracking-[-0.03em] leading-[1.22]"
              style={{ color: 'rgba(248,249,247,0.92)' }}>
            직접 보고,<br />직접 분석하고,<br />직접 예측해요.
          </h2>

          <Link
            href="/tutorial"
            onClick={() => trackEvent('landing_cta_clicked', { destination: 'tutorial' })}
            className="mt-2 h-[52px] px-10 flex items-center justify-center
                       text-[14px] font-bold tracking-wide rounded-2xl
                       transition-all duration-150 active:scale-[0.97]"
            style={{
              background:  C.action,
              border:      `1px solid ${C.action}`,
              color:       '#fff',
              boxShadow:   '0 4px 28px rgba(91,127,255,0.38)',
            }}
          >
            NAVIchart 시작하기
          </Link>

          <Link
            href="/chart"
            onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart' })}
            className="text-[12px] transition-colors duration-150"
            style={{ color: 'rgba(248,249,247,0.35)' }}
          >
            차트 바로 보기
          </Link>
        </div>
      </section>
    </main>
  )
}
