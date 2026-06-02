'use client'

/**
 * LandingCTA — 홈 페이지 CTA 버튼 (Analytics 포함)
 *
 * 홈(/)은 Server Component 이므로 onClick을 직접 붙일 수 없다.
 * CTA 버튼만 분리해 Client Component 로 만들어 클릭 이벤트를 추적한다.
 *
 * 추적 이벤트:
 *   landing_cta_clicked  { destination: 'tutorial' | 'chart' }
 *
 * 이 이벤트로 랜딩 → 튜토리얼 시작 전환율을 측정할 수 있다.
 */

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export function LandingCTA() {
  return (
    <div className="flex flex-col w-full max-w-[288px] relative z-10 gap-2.5">

      {/* 주 CTA: 튜토리얼 시작 */}
      <Link
        href="/tutorial"
        onClick={() => trackEvent('landing_cta_clicked', { destination: 'tutorial' })}
        className="
          w-full h-[52px] flex items-center justify-center
          bg-navi-action text-white
          text-[14px] font-bold tracking-wide
          rounded-xl border border-navi-action
          hover:bg-navi-action-hover
          transition-all duration-150 active:scale-[0.97]
          whitespace-nowrap
          shadow-[0_4px_20px_rgba(91,127,255,0.32)]
        "
      >
        튜토리얼 시작하기
      </Link>

      {/* 버튼 보조 정보 */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-quiet-45">
        <span>약 7~10분</span>
        <span
          className="w-1 h-1 bg-navi-border2 shrink-0 inline-block"
          style={{ clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }}
        />
        <span>16단계 실습</span>
        <span
          className="w-1 h-1 bg-navi-border2 shrink-0 inline-block"
          style={{ clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }}
        />
        <span>틀려도 괜찮아요</span>
      </div>

      {/* 보조 CTA: 차트 바로 보기 */}
      <Link
        href="/chart"
        onClick={() => trackEvent('landing_cta_clicked', { destination: 'chart' })}
        className="
          w-full h-11 flex items-center justify-center
          bg-transparent text-navi-secondary
          text-[13px] font-medium
          rounded-xl border border-navi-border
          hover:border-navi-border2 hover:text-navi-text
          transition-all duration-150
          whitespace-nowrap
        "
      >
        차트 바로 보기
      </Link>

    </div>
  )
}
