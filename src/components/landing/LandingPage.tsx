'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// 공통 상수
// ─────────────────────────────────────────────────────────────────────────────
const BG    = '#030617'
const TEXT  = '#F8FAFC'    /* Primary Text */
const MUTED = '#CBD5E1'    /* Secondary Text */
const DIM   = '#64748B'    /* Disabled Text */
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
// NaviButterfly — 배경 없는 나비 날개 (장식용 인라인 SVG)
// ─────────────────────────────────────────────────────────────────────────────
function NaviButterfly({
  size    = 120,
  opacity = 0.07,
  color   = '#2D4198',
  rotate  = 0,
  flipX   = false,
  style   = {},
}: {
  size?:    number
  opacity?: number
  color?:   string
  rotate?:  number
  flipX?:   boolean
  style?:   React.CSSProperties
}) {
  const transform = [
    rotate ? `rotate(${rotate}deg)` : '',
    flipX  ? 'scaleX(-1)'           : '',
  ].filter(Boolean).join(' ') || undefined

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill={color}
      aria-hidden="true"
      style={{ opacity, transform, pointerEvents: 'none', userSelect: 'none', flexShrink: 0, ...style }}
    >
      <polygon points="80.16 102.53 126.02 270.96 189.14 313.31 164.69 320.95 116.56 391.34 207.69 357.28 231.76 327.41 242.66 238.7 225.8 195.38 80.16 102.53" />
      <polygon points="257.02 264.74 251.7 329.74 383.16 285.1 466.23 139.6 314.84 187.55 257.02 264.74" />
      <polygon points="298.84 319.45 258.2 339.75 266.68 371.84 321.09 405.58 339.5 383.89 340.21 332.96 298.84 319.45" />
    </svg>
  )
}

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
// FeatureTag — 라벨 칩
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
    <div className="flex flex-col gap-5">
      <motion.div {...fadeUp(delay)}>
        <FeatureTag>{tag}</FeatureTag>
      </motion.div>
      <motion.h2
        {...fadeUp(delay + 0.08)}
        style={{
          fontSize:      'clamp(30px, 3.4vw, 46px)',
          fontWeight:    900,
          letterSpacing: '-0.035em',
          lineHeight:    1.15,
          color:         TEXT,
        }}
      >
        {headline}
      </motion.h2>
      <motion.p
        {...fadeUp(delay + 0.16)}
        style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, maxWidth: 380, wordBreak: 'keep-all' }}
      >
        {sub}
      </motion.p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckIcon — CTA 신뢰 뱃지용 원형 체크 아이콘
// ─────────────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg
      width={18} height={18} viewBox="0 0 18 18"
      fill="none" aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx={9} cy={9} r={8.5} stroke="rgba(91,127,255,0.30)" />
      <path
        d="M5.5 9.5L7.5 11.5L12.5 6.5"
        stroke={BLUE} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OutcomeCard — 분석 도구 결과 카드
// ─────────────────────────────────────────────────────────────────────────────
function OutcomeCard({
  tool, outcome, delay = 0,
}: {
  tool:    string
  outcome: string
  delay?:  number
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      style={{
        padding:       '18px 20px',
        borderRadius:  12,
        border:        '1px solid rgba(38,53,88,0.65)',
        background:    'rgba(10,16,38,0.70)',
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
      }}
    >
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.12em',
        color:         BLUE,
        textTransform: 'uppercase',
      }}>
        {tool}
      </span>
      <span style={{
        fontSize:   14,
        color:      TEXT,
        lineHeight: 1.55,
        fontWeight: 500,
        wordBreak:  'keep-all',
      }}>
        {outcome}
      </span>
    </motion.div>
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
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        height:         large ? 56 : 48,
        padding:        primary ? (large ? '0 36px' : '0 26px') : '0 20px',
        background:     primary ? BLUE : 'transparent',
        color:          primary ? '#fff' : MUTED,
        fontSize:       primary ? (large ? 15 : 14) : 13,
        fontWeight:     primary ? 700 : 500,
        borderRadius:   14,
        border:         primary ? `1px solid ${BLUE}` : '1px solid rgba(38,53,88,0.9)',
        display:        'flex',
        alignItems:     'center',
        boxShadow:      primary ? '0 4px 28px rgba(91,127,255,0.32)' : 'none',
        textDecoration: 'none',
        whiteSpace:     'nowrap' as const,
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
        height:     1,
        margin:     '0 auto',
        maxWidth:   1100,
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

      {/* ══ Section 1 — Hero: 무엇을 얻는가 ═══════════════════ */}
      <section
        className="relative flex flex-col items-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: 'clamp(100px, 16vh, 172px)' }}
      >
        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(45,65,152,0.22) 0%, transparent 62%)',
        }} />

        {/* 나비 1: 우측 상단 */}
        <NaviButterfly
          size={380} opacity={0.055} color="#2D4198" rotate={18}
          style={{ position: 'absolute', top: '4%', right: '-4%' }}
        />
        {/* 나비 2: 좌측 하단 */}
        <NaviButterfly
          size={200} opacity={0.042} color="#5B7FFF" rotate={-14} flipX
          style={{ position: 'absolute', bottom: '18%', left: '0%' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative z-10 flex flex-col items-center text-center gap-7 px-6"
          style={{ maxWidth: 720 }}
        >
          {/* 타이포 로고 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <img
              src="/navi-logo.svg"
              alt="NAVIchart"
              draggable={false}
              style={{ height: 108, width: 'auto' }}
              className="select-none"
            />
          </motion.div>

          {/* 메인 헤드라인 */}
          <h1 style={{
            fontSize:      'clamp(38px, 5.8vw, 66px)',
            fontWeight:    900,
            letterSpacing: '-0.035em',
            lineHeight:    1.12,
            color:         TEXT,
          }}>
            주식 초보도<br />
            차트를 분석할 수 있게
          </h1>

          {/* 서브 카피 */}
          <p style={{
            fontSize:   'clamp(14px, 1.5vw, 17px)',
            color:      MUTED,
            lineHeight: 1.75,
            maxWidth:   480,
            wordBreak:  'keep-all',
          }}>
            실제 차트를 보며 직접 분석하고 판단하는 과정으로<br />
            차트 분석 능력을 키웁니다.
          </p>

          {/* 숫자 통계 행 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="flex items-center gap-2 flex-wrap justify-center"
            style={{ fontSize: 14 }}
          >
            <span style={{ fontWeight: 700, color: TEXT }}>15단계</span>
            <span style={{ color: MUTED }}>실습</span>
            <span style={{ color: 'rgba(38,53,88,0.9)', marginLeft: 6, marginRight: 6 }}>·</span>
            <span style={{ fontWeight: 700, color: TEXT }}>4가지</span>
            <span style={{ color: MUTED }}>분석 도구</span>
            <span style={{ color: 'rgba(38,53,88,0.9)', marginLeft: 6, marginRight: 6 }}>·</span>
            <span style={{ fontWeight: 700, color: TEXT }}>실제</span>
            <span style={{ color: MUTED }}>주식 데이터</span>
          </motion.div>
        </motion.div>

        {/* Hero 목업 */}
        <motion.div
          initial={{ opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          className="relative z-10 w-full px-4 sm:px-12"
          style={{ maxWidth: 1180, marginTop: 'clamp(60px, 9vh, 96px)', marginBottom: -100 }}
        >
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
               style={{ height: 220, background: `linear-gradient(to top, ${BG} 5%, rgba(3,6,23,0.85) 40%, transparent 100%)` }} />
          <div style={{ perspective: '1600px', perspectiveOrigin: '50% 0%' }}>
            <div style={{ transform: 'rotateX(7deg)', transformOrigin: 'top center' }}>
              <BrowserFrame
                src="/landing/shot-chart-ma.png"
                alt="NAVIchart — 실제 NVDA 차트 분석 화면"
                glow="hero"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* 섹션 간 여백 */}
      <div style={{ height: 'clamp(160px, 20vh, 220px)' }} />

      {/* ══ Section 2 — 어떻게 배우는가 ════════════════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 'clamp(160px, 20vh, 220px)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          <FeatureText
            tag="학습 방법"
            headline={<>읽는 게 아니라<br />직접 해보며<br />익혀요.</>}
            sub="15단계 실습을 직접 클릭하며 풀어가요. 설명을 읽는 게 아니라 차트 위에서 직접 판단하는 과정이 능력을 만들어요."
          />
          <motion.div {...fadeLeft(0.12)}>
            <BrowserFrame
              src="/landing/shot-chart.png"
              alt="NAVIchart — 단계별 차트 실습 화면"
              glow="feature"
            />
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* 나비 구분 포인트 */}
      <div className="flex justify-center" style={{ marginTop: 56, marginBottom: 56 }}>
        <NaviButterfly size={52} opacity={0.18} color="#5B7FFF" rotate={6} />
      </div>

      {/* ══ Section 3 — 어떤 분석 도구를 익히는가 ══════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 'clamp(160px, 20vh, 220px)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          {/* 좌: 목업 이미지 */}
          <motion.div {...fadeRight(0.08)} className="lg:order-1">
            <BrowserFrame
              src="/landing/shot-chart-ind.png"
              alt="NAVIchart — MA·RSI·MACD·BB 분석 도구 화면"
              glow="feature"
            />
          </motion.div>

          {/* 우: 텍스트 + 결과 카드 */}
          <div className="lg:order-2 flex flex-col gap-8">
            <FeatureText
              tag="분석 도구"
              headline={<>4가지 도구로<br />시장을 읽는<br />눈을 만들어요.</>}
              sub="각 도구가 무엇을 볼 수 있게 해주는지, 직접 켜보며 몸으로 익혀요."
              delay={0.06}
            />

            {/* 결과 중심 OutcomeCard 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <OutcomeCard tool="MA"   outcome="추세의 방향을 읽는다"       delay={0.10} />
              <OutcomeCard tool="RSI"  outcome="과매수·과매도를 판단한다"   delay={0.15} />
              <OutcomeCard tool="MACD" outcome="추세 전환 시점을 포착한다"  delay={0.20} />
              <OutcomeCard tool="BB"   outcome="변동성의 범위를 파악한다"   delay={0.25} />
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ Section 4 — 실전 시뮬레이션으로 검증 ═══════════════ */}
      <section
        className="relative px-4 sm:px-12"
        style={{ paddingTop: 'clamp(160px, 20vh, 220px)', paddingBottom: 'clamp(160px, 20vh, 220px)' }}
      >
        <div className="flex flex-col items-center text-center gap-5"
             style={{ maxWidth: 600, margin: '0 auto 80px' }}>
          <motion.div {...fadeUp(0)}>
            <FeatureTag>실전 시뮬레이션</FeatureTag>
          </motion.div>
          <motion.h2
            {...fadeUp(0.08)}
            style={{
              fontSize:      'clamp(30px, 3.4vw, 46px)',
              fontWeight:    900,
              letterSpacing: '-0.035em',
              lineHeight:    1.15,
              color:         TEXT,
            }}
          >
            배운 것을<br />실제 데이터로 검증해요.
          </motion.h2>
          <motion.p
            {...fadeUp(0.16)}
            style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, maxWidth: 480, wordBreak: 'keep-all' }}
          >
            실제 주식 데이터로 30일 예측 시뮬레이션을 직접 해보고,
            틀리면서 판단력을 키워요.
          </motion.p>
        </div>

        <motion.div {...fadeUp(0.12)} style={{ maxWidth: 1000, margin: '0 auto' }}>
          <BrowserFrame
            src="/landing/shot-simulate.png"
            alt="NAVIchart 실전 시뮬레이션 — 상승·하락·횡보 예측"
            glow="feature"
          />
        </motion.div>
      </section>

      {/* ══ Final CTA ════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ paddingTop: 'clamp(140px, 18vh, 200px)', paddingBottom: 'clamp(140px, 18vh, 200px)' }}
      >
        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, rgba(45,65,152,0.18) 0%, transparent 62%)',
        }} />

        {/* 나비 4: CTA 배경 중앙 */}
        <NaviButterfly
          size={260} opacity={0.052} color="#2D4198" rotate={10}
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(10deg)' }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* 브랜드 로고 */}
          <motion.div {...fadeUp(0)}>
            <img
              src="/navi-logo.svg"
              alt="NAVIchart"
              draggable={false}
              style={{ height: 34, width: 'auto', opacity: 0.72 }}
              className="select-none"
            />
          </motion.div>

          <motion.h2
            {...fadeUp(0.08)}
            style={{
              fontSize:      'clamp(42px, 5.5vw, 68px)',
              fontWeight:    900,
              letterSpacing: '-0.04em',
              lineHeight:    1.1,
              color:         TEXT,
            }}
          >
            지금 바로<br />시작해요.
          </motion.h2>

          {/* 신뢰 뱃지 3개 */}
          <motion.div
            {...fadeUp(0.14)}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-7"
          >
            {[
              '약 10분',
              '회원가입 없이 체험 가능',
              '실제 차트 데이터 사용',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckIcon />
                <span style={{ fontSize: 13, color: MUTED }}>{text}</span>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.22)} className="flex items-center gap-3 mt-1">
            <CTAButton
              href="/tutorial"
              primary
              large
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'tutorial' })}
            >
              NAVIchart 시작하기
            </CTAButton>
          </motion.div>

          <motion.div {...fadeUp(0.28)}>
            <Link
              href="/chart"
              onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart' })}
              style={{ fontSize: 12, color: DIM, textDecoration: 'none' }}
            >
              차트 바로 보기
            </Link>
          </motion.div>
        </div>
      </section>

    </main>
  )
}
