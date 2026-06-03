'use client'

/**
 * IndicatorPageEvents
 *
 * 지표 상세 페이지(/indicator/[slug])는 Server Component 이므로
 * 이벤트 추적을 위해 이 Client Component 를 별도 삽입합니다.
 *
 * 수집 이벤트
 *   indicator_page_viewed  — 페이지 진입 시 자동 발화
 *   indicator_cta_clicked  — "차트에서 직접 확인해보기" 클릭 시
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

interface Props {
  indicator:  string   // slug (예: 'rsi', 'macd', ...)
  difficulty: number   // 1 | 2 | 3
}

/** 페이지 진입 추적 */
export function IndicatorPageTracker({ indicator, difficulty }: Props) {
  useEffect(() => {
    trackEvent('indicator_page_viewed', { indicator, difficulty })
  // 마운트 1회만 발화
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

/** 하단 CTA 버튼 — 클릭 추적 포함 */
export function IndicatorCTAButton({ indicator }: { indicator: string }) {
  return (
    <Link
      href="/chart"
      onClick={() => trackEvent('indicator_cta_clicked', { indicator })}
      className="w-full block text-center py-3.5 bg-navi-action text-white
                 text-[14px] font-semibold rounded-2xl hover:bg-navi-action-hover transition-colors"
    >
      차트에서 직접 확인해보기 →
    </Link>
  )
}
