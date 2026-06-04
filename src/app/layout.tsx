import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { PostHogProvider }  from '@/components/analytics/PostHogProvider'

const SITE_URL = 'https://navichart.co.kr'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NAVI Chart — 처음 시작하는 주식 차트',
  description: '복잡한 차트, 이제 쉽게 읽어요. 초보 투자자를 위한 주식 차트 분석 서비스.',
  openGraph: {
    title: 'NAVI Chart — 처음 시작하는 주식 차트',
    description: '복잡한 차트, 이제 쉽게 읽어요. 초보 투자자를 위한 주식 차트 분석 서비스.',
    url: SITE_URL,
    siteName: 'NAVI Chart',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NAVI Chart — 처음 시작하는 주식 차트',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NAVI Chart — 처음 시작하는 주식 차트',
    description: '복잡한 차트, 이제 쉽게 읽어요. 초보 투자자를 위한 주식 차트 분석 서비스.',
    images: ['/og-image.png'],
  },
  verification: {
    google: '7WIZTSNBgaKs_x8iiWH6K6AkxW2E-ZhGVvpzYqO9mQo',
    other: {
      'naver-site-verification':
        'e63ac1ea2f178e4b833dcb63dc853b0e6cde2c70',
    },
  },
}

/**
 * GA4 측정 ID
 * NEXT_PUBLIC_GA_ID 환경변수가 설정된 경우에만 스크립트를 삽입한다.
 * · 로컬 개발 : .env.local 에 값 없음  → 스크립트 미삽입
 * · Vercel 배포 : 환경변수에 값 있음    → 스크립트 자동 삽입
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

/**
 * 테마 플래시(FOUC) 방지 인라인 스크립트
 * React 하이드레이션 전에 실행되어 올바른 테마 클래스를 적용합니다.
 */
const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('navi-theme');
    var mode = stored ? JSON.parse(stored).state?.mode : 'dark';
    if (mode === 'light') document.documentElement.classList.add('light');
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* JSON-LD 구조화 데이터 — Google 로고·조직 인식용 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'NAVI Chart',
              url: SITE_URL,
              description: '복잡한 차트, 이제 쉽게 읽어요. 초보 투자자를 위한 주식 차트 분석 서비스.',
              publisher: {
                '@type': 'Organization',
                name: 'NAVI Chart',
                url: SITE_URL,
                logo: {
                  '@type': 'ImageObject',
                  url: `${SITE_URL}/icon.png`,
                  width: 800,
                  height: 800,
                },
              },
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>

        {/* ── Google Analytics 4 ────────────────────────────────────
            Server Component 에서 직접 Script 삽입:
            · IS_PROD / NODE_ENV 조건 없음 → 환경변수 유무가 활성화 기준
            · NEXT_PUBLIC_GA_ID 가 Vercel 에 설정되어 있으면 무조건 로드됨
            · strategy="afterInteractive" → 페이지 인터랙션 후 로드 (성능 최적)
        ──────────────────────────────────────────────────────────── */}
        {GA_ID && (
          <>
            {/* GA4 메인 라이브러리 스크립트 */}
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            {/* gtag 초기화 — window.gtag 함수 정의 + 첫 page_view 자동 전송 */}
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
            {/* SPA 라우팅 page_view 추적 (usePathname 필요 → Client Component) */}
            <GoogleAnalytics gaId={GA_ID} />
          </>
        )}

        {/* ── PostHog ────────────────────────────────────────────── */}
        <PostHogProvider>
          {children}
        </PostHogProvider>

      </body>
    </html>
  )
}
