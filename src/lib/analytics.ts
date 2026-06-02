/**
 * analytics.ts — NAVI Chart 통합 이벤트 유틸리티
 *
 * trackEvent() 하나로 GA4 + PostHog 동시 전송.
 *
 *   trackEvent('tutorial_started')
 *   trackEvent('tutorial_step_viewed', { step: 3 })
 *   trackEvent('indicator_enabled', { indicator: 'RSI' })
 *
 * ── GA4 전송 조건 ─────────────────────────────────────────
 * window.gtag 존재 여부만 체크한다.
 * GoogleAnalytics.tsx 가 Production 에서만 gtag를 초기화하므로
 * 별도 NODE_ENV / 측정ID 체크 불필요.
 * (이전: NEXT_PUBLIC_GA_ID env var 체크 → Vercel 미설정 시 커스텀 이벤트 누락 버그)
 *
 * ── PostHog 전송 조건 ─────────────────────────────────────
 * PostHogProvider.tsx 가 Production 에서만 posthog.init()을 호출.
 * init 전 capture() 호출 시 내부 큐에 적재 → init 후 자동 flush.
 * NEXT_PUBLIC_POSTHOG_KEY 미설정 시 조용히 스킵.
 *
 * ── 개발 환경 ─────────────────────────────────────────────
 * console.log 로 이벤트를 확인할 수 있다.
 * GA4/PostHog 서버로는 전송되지 않는다.
 */

import posthog from 'posthog-js'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[]
  }
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const IS_PROD     = process.env.NODE_ENV === 'production'

export type EventParams = Record<string, string | number | boolean | null | undefined>

/** 현재 기기 타입 반환 (Tailwind sm 기준 768px) */
export function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return window.innerWidth < 768 ? 'mobile' : 'desktop'
}

/**
 * 커스텀 이벤트 전송 — GA4 + PostHog 동시 발송
 * @param eventName  snake_case 이벤트명
 * @param parameters 추가 properties (선택)
 */
export function trackEvent(eventName: string, parameters?: EventParams): void {
  // ── 개발 환경 로그 ────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    const props = parameters
      ? '\n' + Object.entries(parameters).map(([k, v]) => `  ${k}: ${v}`).join('\n')
      : ''
    console.log(`[ANALYTICS] ${eventName}${props}`)
  }

  if (typeof window === 'undefined') return

  // ── GA4 ──────────────────────────────────────────────────
  // window.gtag 존재 = GA4가 초기화된 상태 (Production 전용)
  if (window.gtag) {
    window.gtag('event', eventName, parameters ?? {})
  }

  // ── PostHog ──────────────────────────────────────────────
  // Production 전용 (PostHogProvider가 IS_PROD 시에만 init)
  if (POSTHOG_KEY && IS_PROD) {
    try {
      posthog.capture(eventName, parameters ?? {})
    } catch {
      /* init 전 극히 드문 타이밍 오류 — 무시 */
    }
  }
}
