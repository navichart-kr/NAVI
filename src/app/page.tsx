import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">

      {/* 로고 */}
      <div className="mb-6">
        <span className="text-4xl font-extrabold tracking-tight">
          <span className="text-navi-accent">NAVI</span>
          <span className="text-navi-text"> Chart</span>
        </span>
        <p className="text-navi-muted text-sm mt-1">처음 시작하는 주식 차트</p>
      </div>

      {/* 헤드라인 */}
      <h1 className="text-3xl md:text-4xl font-bold text-navi-text leading-tight max-w-md">
        "RSI를 배웠다"가 아니라<br />
        <span className="text-navi-accent">"차트를 읽을 수 있다"</span>
      </h1>
      <p className="mt-4 text-navi-muted text-base max-w-sm leading-relaxed">
        직접 클릭하고, 선을 그어보고, 판단하면서<br />
        차트 읽기 능력이 자연스럽게 생겨요.
      </p>

      {/* CTA 버튼 */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link
          href="/tutorial"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5
                     bg-navi-accent text-white font-semibold rounded-2xl
                     hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <span>🚀</span>
          <span>튜토리얼 시작</span>
          <span className="text-indigo-200 text-xs font-normal">15단계</span>
        </Link>
        <Link
          href="/chart"
          className="flex-1 px-6 py-3.5 bg-navi-surface border border-navi-border
                     text-navi-muted font-medium rounded-2xl
                     hover:border-navi-accent hover:text-navi-text transition-colors text-sm"
        >
          바로 차트 보기
        </Link>
      </div>

      {/* 학습 흐름 미리보기 */}
      <div className="mt-10 flex flex-wrap gap-2 justify-center max-w-sm">
        {[
          { icon: '📊', label: '캔들 읽기' },
          { icon: '📈', label: 'MA 추세' },
          { icon: '🌡️', label: 'RSI 판단' },
          { icon: '🔄', label: 'MACD 신호' },
          { icon: '〰️', label: '볼린저 밴드' },
          { icon: '📋', label: '종합 테스트' },
          { icon: '🔮', label: '시뮬레이션' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 px-3 py-1 bg-navi-surface border border-navi-border
                       text-navi-muted text-xs rounded-full"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>

      {/* 신뢰 문구 */}
      <p className="mt-8 text-[11px] text-navi-muted/60">
        틀려도 괜찮아요 · 어떤 버튼을 눌러도 데이터는 사라지지 않아요
      </p>

    </main>
  )
}
