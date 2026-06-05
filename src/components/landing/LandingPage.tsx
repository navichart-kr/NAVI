'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// 공통 상수
// ─────────────────────────────────────────────────────────────────────────────
const BG    = '#030617'
const TEXT  = 'rgba(248,249,247,0.93)'
const MUTED = 'rgba(248,249,247,0.50)'
const DIM   = 'rgba(248,249,247,0.35)'
const BLUE  = '#5B7FFF'
const EASE  = [0.16, 1, 0.3, 1] as const

// ─────────────────────────────────────────────────────────────────────────────
// 애니메이션 helpers
// ─────────────────────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:     { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0  },
  viewport:    { once: true, margin: '-40px' },
  transition:  { duration: 0.75, ease: EASE, delay },
})

const fadeLeft = (delay = 0) => ({
  initial:     { opacity: 0, x: 50 },
  whileInView: { opacity: 1, x: 0  },
  viewport:    { once: true, margin: '-40px' },
  transition:  { duration: 0.85, ease: EASE, delay },
})

const fadeRight = (delay = 0) => ({
  initial:     { opacity: 0, x: -50 },
  whileInView: { opacity: 1, x: 0  },
  viewport:    { once: true, margin: '-40px' },
  transition:  { duration: 0.85, ease: EASE, delay },
})

// ─────────────────────────────────────────────────────────────────────────────
// BrowserFrame — macOS 브라우저 창 목업
// ─────────────────────────────────────────────────────────────────────────────
type GlowLevel = 'hero' | 'feature' | 'none'

function BrowserFrame({
  src, alt, glow = 'none', style = {},
}: {
  src:    string
  alt:    string
  glow?:  GlowLevel
  style?: React.CSSProperties
}) {
  const shadows: Record<GlowLevel, string> = {
    hero:    '0 48px 120px rgba(0,0,0,0.75), 0 0 0 1px rgba(38,53,88,0.75), 0 0 100px rgba(45,65,152,0.22)',
    feature: '0 28px 72px rgba(0,0,0,0.60), 0 0 0 1px rgba(38,53,88,0.70), 0 0 50px rgba(45,65,152,0.12)',
    none:    '0 20px 52px rgba(0,0,0,0.50), 0 0 0 1px rgba(38,53,88,0.60)',
  }

  return (
    <div
      className="overflow-hidden select-none"
      style={{
        borderRadius: 12,
        border:       '1px solid rgba(38,53,88,0.85)',
        boxShadow:    shadows[glow],
        background:   '#030617',
        ...style,
      }}
    >
      {/* 브라우저 크롬 */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 36, background: '#06091a', borderBottom: '1px solid rgba(27,40,71,0.9)' }}
      >
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div
            className="flex items-center px-3 text-[10px]"
            style={{
              height: 22, borderRadius: 6,
              background: '#101936', border: '1px solid rgba(27,40,71,0.9)',
              color: 'rgba(248,249,247,0.38)',
              minWidth: 150, maxWidth: 240,
            }}
          >
            navichart.co.kr
          </div>
        </div>
        <div className="shrink-0" style={{ width: 56 }} />
      </div>
      {/* 스크린샷 */}
      <Image
        src={src} alt={alt}
        width={2880} height={1800}
        className="w-full h-auto block"
        style={{ display: 'block' }}
        priority={glow === 'hero'}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FeatureTag — 작은 라벨 칩
// ─────────────────────────────────────────────────────────────────────────────
function FeatureTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold tracking-[0.13em] uppercase px-3 py-1 rounded-full"
      style={{
        background: 'rgba(91,127,255,0.10)',
        border:     '1px solid rgba(91,127,255,0.25)',
        color:      '#849DFF',
      }}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FeatureText — 라벨 + 헤드라인 + 서브텍스트 블록
// ─────────────────────────────────────────────────────────────────────────────
function FeatureText({
  tag, headline, sub, delay = 0,
}: {
  tag:      string
  headline: React.ReactNode
  sub:      string
  delay?:   number
}) {
  return (
    <div className="flex flex-col gap-4">
      <motion.div {...fadeUp(delay)}>
        <FeatureTag>{tag}</FeatureTag>
      </motion.div>
      <motion.h2
        {...fadeUp(delay + 0.08)}
        style={{
          fontSize:      'clamp(26px, 3.0vw, 40px)',
          fontWeight:    900,
          letterSpacing: '-0.03em',
          lineHeight:    1.17,
          color:         TEXT,
        }}
      >
        {headline}
      </motion.h2>
      <motion.p
        {...fadeUp(delay + 0.16)}
        style={{ fontSize: 14, color: MUTED, lineHeight: 1.78, maxWidth: 380 }}
      >
        {sub}
      </motion.p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CTAButton
// ─────────────────────────────────────────────────────────────────────────────
function CTAButton({
  href, onClick, primary = false, large = false, children,
}: {
  href:      string
  onClick?:  () => void
  primary?:  boolean
  large?:    boolean
  children:  React.ReactNode
}) {
  const h = large ? 54 : 48
  const px = primary ? (large ? '32px' : '26px') : '20px'

  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        height:         h,
        padding:        `0 ${px}`,
        background:     primary ? BLUE : 'transparent',
        color:          primary ? '#fff' : MUTED,
        fontSize:       primary ? (large ? 15 : 14) : 13,
        fontWeight:     primary ? 700 : 500,
        borderRadius:   13,
        border:         primary ? `1px solid ${BLUE}` : '1px solid rgba(38,53,88,0.9)',
        display:        'flex',
        alignItems:     'center',
        boxShadow:      primary ? '0 4px 28px rgba(91,127,255,0.32)' : 'none',
        textDecoration: 'none',
        whiteSpace:     'nowrap' as const,
        transition:     'opacity 0.15s ease',
      }}
    >
      {children}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Divider — 섹션 구분선
// ─────────────────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        height:  1,
        margin:  '0 auto',
        maxWidth: 1100,
        background: 'linear-gradient(to right, transparent, rgba(38,53,88,0.55) 30%, rgba(38,53,88,0.55) 70%, transparent)',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LandingPage
// ─────────────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <main style={{ background: BG, color: TEXT, overflowX: 'hidden' }}>

      {/* ══ Section 1 — Hero ═════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: 'clamp(80px, 12vh, 120px)' }}
      >
        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(45,65,152,0.22) 0%, transparent 62%)',
        }} />

        {/* 헤드라인 + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative z-10 flex flex-col items-center text-center gap-5 px-6"
          style={{ maxWidth: 660 }}
        >
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, color: DIM }}>
            NAVIchart
          </p>

          <h1 style={{
            fontSize:      'clamp(36px, 5.8vw, 62px)',
            fontWeight:    900,
            letterSpacing: '-0.035em',
            lineHeight:    1.12,
            color:         TEXT,
          }}>
            차트를 분석하는 눈,<br />
            직접 경험으로 키워요.
          </h1>

          <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', color: MUTED, lineHeight: 1.72, maxWidth: 440 }}>
            설명을 읽는 것이 아니라, 실제 차트를 직접 클릭하며 배워요.
          </p>

          <div className="flex items-center gap-3 mt-2">
            <CTAButton href="/tutorial" primary
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'tutorial' })}>
              튜토리얼 시작하기
            </CTAButton>
            <CTAButton href="/chart"
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart' })}>
              차트 바로 보기
            </CTAButton>
          </div>
        </motion.div>

        {/* Hero 목업 */}
        <motion.div
          initial={{ opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          className="relative z-10 w-full px-4 sm:px-12"
          style={{ maxWidth: 1180, marginTop: 'clamp(40px, 6vh, 68px)', marginBottom: -100 }}
        >
          {/* 하단 페이드 */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
               style={{ height: 220, background: `linear-gradient(to top, ${BG} 5%, rgba(3,6,23,0.85) 40%, transparent 100%)` }} />
          {/* 3-D tilt */}
          <div style={{ perspective: '1600px', perspectiveOrigin: '50% 0%' }}>
            <div style={{ transform: 'rotateX(7deg)', transformOrigin: 'top center' }}>
              <BrowserFrame
                src="/landing/shot-chart-ma.png"
                alt="NAVIchart — MA 이동평균선이 표시된 NVDA 차트"
                glow="hero"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* 섹션 간 여백 */}
      <div style={{ height: 'clamp(100px, 14vh, 160px)' }} />

      {/* ══ Section 2 — 튜토리얼 ════════════════════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 'clamp(100px, 14vh, 160px)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <FeatureText
            tag="16단계 튜토리얼"
            headline={<>단계별로,<br />직접 클릭하며<br />배워요.</>}
            sub="캔들 클릭부터 MA·RSI·MACD·볼린저밴드까지, 설명을 읽는 것이 아니라 실제 차트 위에서 직접 경험해요."
          />
          <motion.div {...fadeLeft(0.12)}>
            <BrowserFrame
              src="/landing/shot-chart.png"
              alt="NAVIchart 튜토리얼 — 차트 위 플로팅 학습 카드"
              glow="feature"
            />
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ══ Section 3 — 분석 도구 ════════════════════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ maxWidth: 1180, margin: '0 auto', paddingTop: 'clamp(100px, 14vh, 160px)', paddingBottom: 'clamp(100px, 14vh, 160px)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <motion.div {...fadeRight(0.08)} className="lg:order-1">
            <BrowserFrame
              src="/landing/shot-chart-ind.png"
              alt="NAVIchart — RSI · MACD 지표 패널"
              glow="feature"
            />
          </motion.div>
          <div className="lg:order-2">
            <FeatureText
              tag="차트 분석 도구"
              headline={<>MA·RSI·MACD·BB,<br />직접 켜보면서<br />익혀요.</>}
              sub="지표마다 무엇을 보는지, 어떻게 읽는지를 실제 차트에서 바로 확인할 수 있어요. 하나씩 켜면서 패턴을 눈에 익혀요."
              delay={0.06}
            />
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ Section 4 — 실전 챌린지 ═════════════════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ paddingTop: 'clamp(100px, 14vh, 160px)', paddingBottom: 'clamp(100px, 14vh, 160px)' }}
      >
        {/* 헤더 */}
        <div className="flex flex-col items-center text-center gap-4"
             style={{ maxWidth: 560, margin: '0 auto 56px' }}>
          <motion.div {...fadeUp(0)}>
            <FeatureTag>실전 챌린지</FeatureTag>
          </motion.div>
          <motion.h2
            {...fadeUp(0.08)}
            style={{
              fontSize:      'clamp(26px, 3.0vw, 40px)',
              fontWeight:    900,
              letterSpacing: '-0.03em',
              lineHeight:    1.17,
              color:         TEXT,
            }}
          >
            이 차트,<br />다음에 어떻게 됐을까요?
          </motion.h2>
          <motion.p
            {...fadeUp(0.16)}
            style={{ fontSize: 14, color: MUTED, lineHeight: 1.78, maxWidth: 420 }}
          >
            실제 NVDA 과거 데이터로 직접 예측해보고, 정답을 확인하며 판단력을 키워요.
          </motion.p>
        </div>

        {/* 스크린샷 */}
        <motion.div {...fadeUp(0.12)} style={{ maxWidth: 1000, margin: '0 auto' }}>
          <BrowserFrame
            src="/landing/shot-simulate.png"
            alt="NAVIchart 실전 챌린지 — 상승·하락·횡보 예측"
            glow="feature"
          />
        </motion.div>
      </section>

      {/* ══ Final CTA ════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{ paddingTop: 'clamp(80px, 12vh, 130px)', paddingBottom: 'clamp(80px, 14vh, 160px)' }}
      >
        {/* 배경 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, rgba(45,65,152,0.18) 0%, transparent 62%)',
        }} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.p
            {...fadeUp(0)}
            style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, color: DIM }}
          >
            NAVIchart
          </motion.p>
          <motion.h2
            {...fadeUp(0.08)}
            style={{
              fontSize:      'clamp(34px, 5vw, 58px)',
              fontWeight:    900,
              letterSpacing: '-0.035em',
              lineHeight:    1.14,
              color:         TEXT,
            }}
          >
            지금 바로<br />시작해요.
          </motion.h2>
          <motion.div {...fadeUp(0.16)} className="flex items-center gap-3 mt-2">
            <CTAButton href="/tutorial" primary large
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'tutorial' })}>
              NAVIchart 시작하기
            </CTAButton>
          </motion.div>
          <motion.div {...fadeUp(0.22)}>
            <Link href="/chart"
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart' })}
              style={{ fontSize: 12, color: DIM, textDecoration: 'none' }}>
              차트 바로 보기
            </Link>
          </motion.div>
        </div>
      </section>

    </main>
  )
}
