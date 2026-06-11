'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'

// ── Design tokens ──────────────────────────────────────────────
const BG    = '#030617'
const TEXT  = '#F8FAFC'
const SEC   = '#E2E8F0'
const MUTED = '#94A3B8'
const BLUE  = '#5B7FFF'
const EASE  = [0.16, 1, 0.3, 1] as const

// ── Animation helpers ──────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:     { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: '-40px' },
  transition:  { duration: 0.72, ease: EASE, delay },
})

// ── Screens for scroll sequence ────────────────────────────────
const SCREENS = [
  { src: null,                          label: 'NAVIchart',       sub: '실제 차트로 배우는 학습 플랫폼' },
  { src: '/landing/shot-chart.png',     label: '실시간 차트',     sub: '캔들스틱 · NVDA, TSLA, AAPL, MSFT' },
  { src: '/landing/shot-chart-ma.png',  label: '이동평균선 (MA)', sub: '추세 방향을 읽는 첫 번째 도구' },
  { src: '/landing/shot-chart-ind.png', label: '분석 도구 통합',  sub: 'RSI · MACD · 볼린저밴드 동시 표시' },
  { src: '/landing/shot-tutorial.png',  label: '인터랙티브 학습', sub: '15단계 · 직접 클릭하며 배우는 방식' },
  { src: '/landing/shot-simulate.png',  label: '실전 챌린지',     sub: '예측하고 검증하며 판단력을 키워요' },
] as const

// ── Learning content ───────────────────────────────────────────
const LEARN_ITEMS = [
  { no: '01', title: '캔들 패턴',   desc: '5가지 패턴의 형태와 신호' },
  { no: '02', title: '거래량',      desc: '가격 움직임의 신뢰도 확인' },
  { no: '03', title: 'RSI',         desc: '과매수·과매도 구간 판단' },
  { no: '04', title: 'MACD',        desc: '추세 전환 시점 포착' },
  { no: '05', title: '볼린저 밴드', desc: '변동성 범위와 돌파 신호' },
  { no: '06', title: '피보나치',    desc: '지지·저항 레벨 직접 작도' },
]

// ── Prediction button colors ───────────────────────────────────
const PRED_BTNS = [
  { label: '상승', bg: 'rgba(50,209,122,0.12)',  border: 'rgba(50,209,122,0.45)', color: '#32D17A' },
  { label: '횡보', bg: 'rgba(255,184,77,0.12)',  border: 'rgba(255,184,77,0.45)', color: '#FFB84D' },
  { label: '하락', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.45)', color: '#FF6B6B' },
]

// ── BrowserChrome — macOS titlebar ────────────────────────────
function BrowserChrome({ small = false, opacity = 1 }: { small?: boolean; opacity?: number }) {
  const h = small ? 28 : 36
  const d = small ? 9  : 12
  const g = small ? 5  : 6
  return (
    <div style={{
      height: h, background: '#06091a',
      borderBottom: '1px solid rgba(27,40,71,0.9)',
      display: 'flex', alignItems: 'center',
      padding: `0 ${small ? 10 : 14}px`, gap: g,
      flexShrink: 0, opacity,
    }}>
      <div style={{ display: 'flex', gap: g }}>
        {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
          <div key={i} style={{ width: d, height: d, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          height: small ? 18 : 22, borderRadius: 5,
          background: '#101936', border: '1px solid rgba(27,40,71,0.9)',
          color: 'rgba(248,249,247,0.28)', fontSize: small ? 9 : 10,
          padding: `0 ${small ? 8 : 12}px`,
          display: 'flex', alignItems: 'center', minWidth: small ? 90 : 140,
        }}>
          navichart.co.kr
        </div>
      </div>
      <div style={{ width: small ? 36 : 52 }} />
    </div>
  )
}

// ── MockupFrame — 스크린샷 브라우저 목업 ─────────────────────
function MockupFrame({
  src, alt = '', small = false, glow = false, priority = false,
  imgWidth = 3600, imgHeight = 2082,
  style = {},
}: {
  src: string; alt?: string; small?: boolean
  glow?: boolean; priority?: boolean
  imgWidth?: number; imgHeight?: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {glow && (
        <div style={{
          position: 'absolute', top: '20%', left: '10%', right: '10%', bottom: '-18%',
          background: 'radial-gradient(ellipse at center, rgba(45,65,152,0.32) 0%, transparent 68%)',
          filter: 'blur(52px)', pointerEvents: 'none', zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'relative', zIndex: 1,
        borderRadius: small ? 10 : 13,
        border: '1px solid rgba(38,53,88,0.85)',
        overflow: 'hidden', background: '#030617',
        boxShadow: glow
          ? '0 40px 100px rgba(0,0,0,0.78), 0 0 0 1px rgba(38,53,88,0.55), 0 0 80px rgba(45,65,152,0.16)'
          : '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(38,53,88,0.5)',
      }}>
        <BrowserChrome small={small} />
        <Image
          src={src} alt={alt}
          width={imgWidth} height={imgHeight}
          className="w-full h-auto block"
          priority={priority}
          style={{ display: 'block' }}
        />
      </div>
    </div>
  )
}

// ── Divider ────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{
      height: 1, maxWidth: 1100, margin: '0 auto',
      background: 'linear-gradient(to right, transparent, rgba(38,53,88,0.55) 30%, rgba(38,53,88,0.55) 70%, transparent)',
    }} />
  )
}

// ── SectionLabel ───────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
      color: BLUE, textTransform: 'uppercase' as const, marginBottom: 16,
    }}>
      {children}
    </p>
  )
}

// ── NaviButterfly ──────────────────────────────────────────────
function NaviButterfly({
  size = 120, opacity = 0.07, color = '#3046DD', rotate = 0, flipX = false,
  style = {},
}: {
  size?: number; opacity?: number; color?: string
  rotate?: number; flipX?: boolean; style?: React.CSSProperties
}) {
  const transform = [
    rotate ? `rotate(${rotate}deg)` : '',
    flipX  ? 'scaleX(-1)'           : '',
  ].filter(Boolean).join(' ') || undefined
  return (
    <svg
      viewBox="0 0 512 512" width={size} height={size} fill={color}
      aria-hidden="true"
      style={{ opacity, transform, pointerEvents: 'none', userSelect: 'none', flexShrink: 0, ...style }}
    >
      <polygon points="80.16 102.53 126.02 270.96 189.14 313.31 164.69 320.95 116.56 391.34 207.69 357.28 231.76 327.41 242.66 238.7 225.8 195.38 80.16 102.53" />
      <polygon points="257.02 264.74 251.7 329.74 383.16 285.1 466.23 139.6 314.84 187.55 257.02 264.74" />
      <polygon points="298.84 319.45 258.2 339.75 266.68 371.84 321.09 405.58 339.5 383.89 340.21 332.96 298.84 319.45" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════
// LandingPage
// ════════════════════════════════════════════════════════════════
export function LandingPage() {

  // ── Section 2: scroll sequence ──────────────────────────────
  const seqRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: seqProgress } = useScroll({
    target: seqRef,
    offset: ['start start', 'end end'],
  })
  const [activeScreen, setActiveScreen] = useState(0)
  useMotionValueEvent(seqProgress, 'change', (v) => {
    setActiveScreen(Math.min(SCREENS.length - 1, Math.floor(v * SCREENS.length * 1.01)))
  })

  // ── Section 6: zoom reveal ────────────────────────────────
  const zoomRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: zoomProg } = useScroll({
    target: zoomRef,
    offset: ['start start', 'end end'],
  })
  const zoomPadX      = useTransform(zoomProg, [0, 0.7], ['9vw', '0vw'])
  const zoomRadius    = useTransform(zoomProg, [0, 0.7], [13, 0])
  const chromePadding = useTransform(zoomProg, [0.3, 0.65], [36, 0])
  const chromeOpacity = useTransform(zoomProg, [0.3, 0.62], [1, 0])
  const ctaOpacity    = useTransform(zoomProg, [0.65, 1.0], [0, 1])
  const ctaY          = useTransform(zoomProg, [0.65, 1.0], [28, 0])

  return (
    <main style={{ background: BG, color: TEXT }}>

      {/* ══ Section 1 — Hero ════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        paddingTop: 'clamp(100px, 14vh, 160px)',
        paddingBottom: 0,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 55% at 50% 15%, rgba(45,65,152,0.24) 0%, transparent 62%)',
        }} />

        {/* Butterflies */}
        <NaviButterfly size={300} opacity={0.048} color="#3046DD" rotate={14}
          style={{ position: 'absolute', top: '4%', right: '-2%' }} />
        <NaviButterfly size={160} opacity={0.038} color="#5B7FFF" rotate={-12} flipX
          style={{ position: 'absolute', bottom: '28%', left: '-1%' }} />

        {/* Text block */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          style={{
            position: 'relative', zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: 20,
            padding: '0 clamp(16px, 4vw, 48px)',
            marginBottom: 'clamp(40px, 7vh, 72px)',
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <img
              src="/navi-logo-typo.svg" alt="NAVIchart"
              draggable={false}
              style={{ height: 'clamp(64px, 9vw, 108px)', width: 'auto', opacity: 0.96 }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: EASE }}
            style={{
              fontSize: 'clamp(34px, 5.2vw, 62px)',
              fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.12,
              color: TEXT,
            }}
          >
            주식 초보도<br />차트를 분석할 수 있게
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
            style={{
              fontSize: 'clamp(13px, 1.5vw, 16px)',
              color: MUTED, lineHeight: 1.75, maxWidth: 440, wordBreak: 'keep-all',
            }}
          >
            실제 차트를 보며 직접 분석하고 판단하는 과정으로<br />차트 분석 능력을 키웁니다.
          </motion.p>
        </motion.div>

        {/* Hero mockup — perspective tilt */}
        <motion.div
          initial={{ opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.22, ease: EASE }}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 1180,
            padding: '0 clamp(12px, 3vw, 40px)',
          }}
        >
          {/* Bottom fade gradient */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 220, zIndex: 2, pointerEvents: 'none',
            background: `linear-gradient(to top, ${BG} 8%, rgba(3,6,23,0.88) 42%, transparent 100%)`,
          }} />

          {/* Perspective tilt */}
          <div style={{ perspective: '1600px', perspectiveOrigin: '50% 0%' }}>
            <div style={{ transform: 'rotateX(7deg)', transformOrigin: 'top center' }}>
              <MockupFrame
                src="/landing/shot-chart-ind.png"
                alt="NAVIchart — NVDA 차트 분석 화면 (MA, RSI, MACD, 볼린저밴드)"
                glow
                priority
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ Section 2 — Product sequence ════════════════════════ */}

      {/* PC: sticky scroll zone */}
      <div
        ref={seqRef}
        className="hidden sm:block"
        style={{
          height: `${SCREENS.length * 100}vh`,
          marginTop: 'clamp(80px, 12vh, 140px)',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Subtle background radial */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 70% at 65% 50%, rgba(45,65,152,0.10) 0%, transparent 65%)',
          }} />

          <div style={{
            width: '100%', maxWidth: 1100,
            padding: '0 clamp(24px, 4vw, 56px)',
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 'clamp(40px, 5vw, 80px)',
            alignItems: 'center',
            position: 'relative', zIndex: 1,
          }}>
            {/* Left: text */}
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.38, ease: EASE }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                    color: BLUE, textTransform: 'uppercase' as const,
                  }}>
                    {String(activeScreen + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}
                  </span>
                  <h2 style={{
                    fontSize: 'clamp(24px, 2.6vw, 36px)',
                    fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.18,
                    color: TEXT, margin: 0,
                  }}>
                    {SCREENS[activeScreen].label}
                  </h2>
                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.75, margin: 0 }}>
                    {SCREENS[activeScreen].sub}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 7, marginTop: 24 }}>
                {SCREENS.map((_, i) => (
                  <div key={i} style={{
                    width: i === activeScreen ? 22 : 6, height: 6, borderRadius: 3,
                    background: i === activeScreen ? BLUE : 'rgba(38,53,88,0.9)',
                    transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                ))}
              </div>
            </div>

            {/* Right: cross-fading mockup */}
            <div style={{ position: 'relative' }}>
              {/* Glow behind frame */}
              <div style={{
                position: 'absolute', top: '15%', left: '8%', right: '8%', bottom: '-15%',
                background: 'radial-gradient(ellipse at center, rgba(45,65,152,0.28) 0%, transparent 70%)',
                filter: 'blur(48px)', pointerEvents: 'none', zIndex: 0,
              }} />

              <div style={{
                position: 'relative', zIndex: 1,
                borderRadius: 12,
                border: '1px solid rgba(38,53,88,0.85)',
                overflow: 'hidden', background: '#030617',
                boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
              }}>
                <BrowserChrome small />
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    {activeScreen === 0 ? (
                      <motion.div
                        key="logo-screen"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.32 }}
                        style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'linear-gradient(155deg, #06091a 0%, #030617 100%)',
                        }}
                      >
                        <img
                          src="/navi-logo-typo.svg" alt="NAVIchart" draggable={false}
                          style={{ width: '30%', maxWidth: 170, opacity: 0.92 }}
                        />
                      </motion.div>
                    ) : (
                      <motion.img
                        key={SCREENS[activeScreen].src}
                        src={SCREENS[activeScreen].src!}
                        alt=""
                        draggable={false}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.32 }}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%', objectFit: 'cover',
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: static stack */}
      <div className="sm:hidden" style={{ padding: 'clamp(64px, 10vh, 96px) 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {SCREENS.filter(s => s.src).map((screen, i) => (
            <motion.div key={i} {...fadeUp(i * 0.06)}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                          color: BLUE, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                {String(i + 1).padStart(2, '0')}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 4 }}>{screen.label}</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>{screen.sub}</p>
              <MockupFrame src={screen.src!} small />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══ Section 3 — Observe · Learn · Think ═════════════════ */}
      <section style={{
        padding: 'clamp(120px, 15vh, 180px) clamp(16px, 4vw, 64px)',
        maxWidth: 1300, margin: '0 auto',
      }}>
        <div
          className="grid grid-cols-1 lg:grid-cols-[320px_1fr] items-center"
          style={{ gap: 'clamp(40px, 6vw, 80px)' }}
        >
          {/* Left: keywords */}
          <div className="order-2 lg:order-1" style={{ minWidth: 0 }}>
            <motion.div {...fadeUp(0)}>
              <SectionLabel>Learning Experience</SectionLabel>
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 28 }}>
              {(['Observe.', 'Learn.', 'Think.'] as const).map((word, i) => (
                <motion.div
                  key={word}
                  {...fadeUp(0.06 + i * 0.1)}
                  style={{
                    fontSize: 'clamp(44px, 5vw, 70px)',
                    fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.06,
                    color: `rgba(248,250,252,${1 - i * 0.30})`,
                  }}
                >
                  {word}
                </motion.div>
              ))}
            </div>
            <motion.p
              {...fadeUp(0.36)}
              style={{ fontSize: 14, color: MUTED, lineHeight: 1.9, maxWidth: 340, wordBreak: 'keep-all' }}
            >
              차트 위에서 직접 클릭하며 판단하는 15단계 실습.
              설명을 읽는 게 아니라 몸으로 익히는 방식이에요.
            </motion.p>
          </div>

          {/* Right: tutorial mockup — wider column */}
          <motion.div {...fadeUp(0.12)} className="order-1 lg:order-2">
            <MockupFrame
              src="/landing/shot-tutorial.png"
              alt="NAVIchart 인터랙티브 학습 — 차트 하이라이트 + 학습 카드"
              glow
            />
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ══ Section 4 — Challenge Preview ══════════════════════ */}
      <section style={{
        padding: 'clamp(120px, 15vh, 180px) clamp(16px, 4vw, 64px)',
        maxWidth: 1300, margin: '0 auto',
      }}>
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_320px] items-center"
          style={{ gap: 'clamp(40px, 6vw, 80px)' }}
        >
          {/* Left: simulate mockup — wider column */}
          <motion.div {...fadeUp(0)} className="order-1">
            <MockupFrame
              src="/landing/shot-simulate.png"
              alt="NAVIchart 실전 챌린지 — 주가 예측 시뮬레이션"
              imgWidth={2880} imgHeight={1800}
              glow
            />
          </motion.div>

          {/* Right: text + prediction buttons */}
          <div className="order-2" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <motion.div {...fadeUp(0.08)}>
              <SectionLabel>실전 챌린지</SectionLabel>
              <h2 style={{
                fontSize: 'clamp(28px, 3vw, 42px)',
                fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15,
                color: TEXT, marginBottom: 14,
              }}>
                배운 것을<br />직접 적용해요.
              </h2>
              <p style={{
                fontSize: 14, color: MUTED, lineHeight: 1.9,
                wordBreak: 'keep-all', maxWidth: 340,
              }}>
                실제 주식 과거 데이터로 이후 30일을 예측해봐요.
                틀리는 것도 실력이 되는 과정이에요.
              </p>
            </motion.div>

            {/* Prediction buttons preview */}
            <motion.div
              {...fadeUp(0.18)}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
            >
              {PRED_BTNS.map(({ label, bg, border, color }) => (
                <div key={label} style={{
                  padding: '20px 8px',
                  borderRadius: 12,
                  border: `2px solid ${border}`,
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, color,
                  userSelect: 'none' as const,
                }}>
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ Section 5 — Learning content cards ══════════════════ */}
      <section style={{
        padding: 'clamp(120px, 15vh, 180px) clamp(16px, 4vw, 48px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <motion.div {...fadeUp(0)} style={{ marginBottom: 'clamp(40px, 6vh, 64px)' }}>
          <SectionLabel>무엇을 배우나요</SectionLabel>
          <h2 style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, color: TEXT,
          }}>
            6가지 핵심 분석 도구
          </h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: 14,
        }}>
          {LEARN_ITEMS.map(({ no, title, desc }, i) => (
            <motion.div
              key={no}
              {...fadeUp(i * 0.06)}
              style={{
                padding: '22px 24px', borderRadius: 14,
                border: '1px solid rgba(38,53,88,0.60)',
                background: 'rgba(16,25,54,0.65)',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'border-color 200ms ease',
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                color: BLUE, textTransform: 'uppercase' as const,
              }}>
                {no}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                {title}
              </span>
              <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                {desc}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ Section 6 — Zoom reveal + CTA ═══════════════════════ */}
      <div ref={zoomRef} style={{ height: '260vh', position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Expanding frame */}
          <motion.div style={{
            width: '100%', overflow: 'hidden',
            paddingLeft: zoomPadX, paddingRight: zoomPadX,
          }}>
            <motion.div style={{
              borderRadius: zoomRadius, overflow: 'hidden',
              border: '1px solid rgba(38,53,88,0.85)',
              background: '#030617',
            }}>
              {/* Chrome fades + collapses */}
              <motion.div style={{ height: chromePadding, opacity: chromeOpacity, overflow: 'hidden' }}>
                <BrowserChrome />
              </motion.div>
              <Image
                src="/landing/shot-chart-ind.png"
                alt="NAVIchart 전체 화면"
                width={3600} height={2082}
                className="w-full h-auto block"
                style={{ display: 'block' }}
              />
            </motion.div>
          </motion.div>

          {/* CTA overlay */}
          <motion.div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            opacity: ctaOpacity,
            background: 'rgba(3,6,23,0.82)',
            backdropFilter: 'blur(14px)',
            pointerEvents: 'none',
          }}>
            <motion.div
              style={{
                y: ctaY,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 28,
                pointerEvents: 'auto',
              }}
            >
              <img
                src="/navi-logo-typo.svg" alt="NAVIchart" draggable={false}
                style={{ height: 26, width: 'auto', opacity: 0.60 }}
              />
              <h2 style={{
                fontSize: 'clamp(30px, 4.2vw, 58px)',
                fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1,
                color: TEXT, textAlign: 'center', margin: 0,
              }}>
                이제는 감이 아니라,<br />분석입니다.
              </h2>
              <Link
                href="/chart"
                onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart', position: 'zoom' })}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  height: 52, padding: '0 36px',
                  background: BLUE, color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  borderRadius: 14, border: `1px solid ${BLUE}`,
                  boxShadow: '0 4px 32px rgba(91,127,255,0.40)',
                  textDecoration: 'none', whiteSpace: 'nowrap' as const,
                }}
              >
                NAVIchart 시작하기
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>


    </main>
  )
}
