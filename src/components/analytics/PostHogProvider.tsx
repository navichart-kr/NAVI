'use client'

/**
 * PostHogProvider — PostHog 초기화 + SPA 페이지뷰 추적
 *
 * ── 동작 조건 ─────────────────────────────────────────────
 * Production  : PostHog 완전 활성화 (이벤트 전송 + Session Replay)
 * Development : PostHog 초기화하지 않음 → 테스트 데이터가
 *               프로덕션 대시보드를 오염시키지 않는다.
 *
 * ── 익명 사용자 식별 ──────────────────────────────────────
 * posthog.init 기본 동작: 첫 방문 시 UUID 자동 생성 → localStorage 저장
 * → 재방문 시 동일 ID 재사용. 별도 identify 코드 불필요.
 *
 * ── Session Replay ────────────────────────────────────────
 * 코드 설정은 완료. PostHog 대시보드에서도 켜야 실제 녹화됨.
 * Settings → Project → Recordings → Enable session recording
 *
 * ── autocapture 비활성화 ──────────────────────────────────
 * autocapture: false — 모든 클릭을 자동 캡처하면 커스텀 이벤트와
 * 섞여 대시보드에 노이즈가 생긴다. 명시적 trackEvent()만 사용.
 */

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

const KEY     = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST    = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const IS_PROD = process.env.NODE_ENV === 'production'

/* ── PostHog 초기화 — Production 전용 ────────────────────── */
if (typeof window !== 'undefined' && KEY && IS_PROD) {
  posthog.init(KEY, {
    api_host:          HOST,
    capture_pageview:  false,   // 수동 $pageview 전송 (PageViewTracker 처리)
    capture_pageleave: true,    // 페이지 이탈 추적
    autocapture:       false,   // 자동 캡처 비활성화 — 커스텀 이벤트만 사용
    session_recording: {
      maskAllInputs: false,     // 학습 플랫폼 — 민감 입력값 없음
    },
  })
}

/* ── SPA 페이지뷰 추적 ──────────────────────────────────── */
function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!KEY || !IS_PROD) return
    const qs  = searchParams.toString()
    const url = window.location.origin + pathname + (qs ? '?' + qs : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

/* ── Provider ───────────────────────────────────────────── */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!KEY || !IS_PROD) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
