'use client'

/**
 * GoogleAnalytics — SPA 페이지이동 시 page_view 수동 전송
 *
 * ── 역할 분리 ──────────────────────────────────────────────
 * GA4 스크립트 로드  →  layout.tsx (Server Component) 에서 직접 처리
 * SPA page_view 추적 →  이 컴포넌트 (Client Component, usePathname 필요)
 *
 * Server Component 에서 gaId prop 을 받아 동작하므로
 * IS_PROD / NODE_ENV 조건 없이 항상 안전하게 실행된다.
 * gaId 가 없으면 layout.tsx 에서 렌더하지 않으므로 이 컴포넌트는 호출 자체가 안 됨.
 *
 * ── 첫 page_view 처리 ──────────────────────────────────────
 * GA4 init 스크립트가 자동으로 첫 page_view 를 전송한다.
 * useEffect 의 첫 실행은 isFirst ref 로 건너뛰어 중복 방지.
 */

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface Props {
  gaId: string
}

export function GoogleAnalytics({ gaId }: Props) {
  const pathname = usePathname()
  const isFirst  = useRef(true)

  useEffect(() => {
    // 첫 렌더는 GA4 init 의 자동 page_view 에 맡긴다
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    // SPA 라우팅 이동 시 page_view 수동 전송
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', gaId, { page_path: pathname })
    }
  }, [pathname, gaId])

  return null
}
