import { LandingCTA } from '@/components/analytics/LandingCTA'

export default function LandingPage() {
  return (
    <main className="
      min-h-screen bg-navi-bg navi-grid-bg
      flex flex-col items-center justify-center
      px-6 py-16 relative overflow-hidden
    ">

      {/* ── 배경 장식 — NAVI 심볼 대형 × 2 ──────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* 우측 상단 대형 심볼 — NAVI앱로고.svg 좌표 */}
        <svg
          viewBox="0 0 512 512"
          fill="currentColor"
          className="absolute text-navi-accent"
          style={{
            width: 'min(60vw, 440px)',
            top: '-8%', right: '-12%',
            opacity: 0.07,
            transform: 'rotate(20deg)',
          }}
        >
          <polygon points="80.16 102.53 126.02 270.96 189.14 313.31 164.69 320.95 116.56 391.34 207.69 357.28 231.76 327.41 242.66 238.7 225.8 195.38 80.16 102.53" />
          <polygon points="257.02 264.74 251.7 329.74 383.16 285.1 466.23 139.6 314.84 187.55 257.02 264.74" />
          <polygon points="298.84 319.45 258.2 339.75 266.68 371.84 321.09 405.58 339.5 383.89 340.21 332.96 298.84 319.45" />
        </svg>
        {/* 좌측 하단 심볼 — NAVI앱로고.svg 좌표 */}
        <svg
          viewBox="0 0 512 512"
          fill="currentColor"
          className="absolute text-navi-accent"
          style={{
            width: 'min(40vw, 280px)',
            bottom: '5%', left: '-8%',
            opacity: 0.05,
            transform: 'rotate(-15deg) scaleX(-1)',
          }}
        >
          <polygon points="80.16 102.53 126.02 270.96 189.14 313.31 164.69 320.95 116.56 391.34 207.69 357.28 231.76 327.41 242.66 238.7 225.8 195.38 80.16 102.53" />
          <polygon points="257.02 264.74 251.7 329.74 383.16 285.1 466.23 139.6 314.84 187.55 257.02 264.74" />
          <polygon points="298.84 319.45 258.2 339.75 266.68 371.84 321.09 405.58 339.5 383.89 340.21 332.96 298.84 319.45" />
        </svg>
      </div>

      {/* ── 브랜드 헤더 ─────────────────────────────────── */}
      <div className="flex flex-col items-center mb-10 relative z-10">
        {/* Dark 모드 로고 */}
        <img
          src="/navi-logo.svg"
          alt="NAVI Chart"
          className="navi-logo-dark w-80 h-auto select-none"
          draggable={false}
        />
        {/* Light 모드 로고 */}
        <img
          src="/navi-logo-light.svg"
          alt="NAVI Chart"
          className="navi-logo-light w-80 h-auto select-none"
          draggable={false}
        />
      </div>

      {/* ── 헤드라인 ─────────────────────────────────────── */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-[26px] sm:text-[30px] font-black tracking-[-0.025em]
                       leading-[1.22] max-w-sm mx-auto mb-3">
          <span className="text-quiet-60">"RSI를 배웠다"</span>가 아닌<br />
          <span className="text-navi-text">"차트를 분석할 수 있다"</span>
        </h1>
        <p className="text-[13px] leading-relaxed max-w-xs mx-auto text-quiet-60">
          직접 클릭하고, 판단하고, 틀리면서<br />
          차트 분석 능력이 자연스럽게 생겨요.
        </p>
      </div>

      {/* ── CTA — Client Component (클릭 이벤트 추적 포함) ── */}
      <LandingCTA />

    </main>
  )
}
