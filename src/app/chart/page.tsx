'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { RSIChart } from '@/components/chart/RSIChart'
import { MACDChart } from '@/components/chart/MACDChart'
import { IndicatorToolbar } from '@/components/chart/IndicatorToolbar'
import { PeriodToolbar } from '@/components/chart/PeriodToolbar'
import { DrawingToolbar } from '@/components/chart/DrawingToolbar'
import { TutorialManager }    from '@/components/tutorial/TutorialManager'
import { TutorialMenuButton } from '@/components/tutorial/TutorialMenuButton'
import { IndicatorToast }     from '@/components/ui/IndicatorToast'
import { NaviSymbol }         from '@/components/ui/NaviSymbol'
import { ThemeToggle }        from '@/components/ui/ThemeToggle'
import { MobileBottomBar }    from '@/components/mobile/MobileBottomBar'
import { useTutorialStore }   from '@/stores/tutorialStore'
import { useChartStore } from '@/stores/chartStore'
import { useLearnStore } from '@/stores/learnStore'
import { useStockData } from '@/hooks/useStockData'
import Link from 'next/link'

function ChartPageInner() {
  const { hasCompletedOnce, start, startLesson } = useTutorialStore()
  const { activeIndicators, drawingTool } = useChartStore()
  const { markIndicator, markDrawing, triedIndicators } = useLearnStore()
  const searchParams = useSearchParams()

  /* ─── 첫 지표 활성화 시 컨텍스트 토스트 ─────────────────────── */
  const [toastSlug, setToastSlug] = useState<string | null>(null)
  const prevInds = useRef(new Set<string>())

  // 실제 NVDA 데이터 fetch
  useStockData('NVDA')

  const showRSI  = activeIndicators.has('rsi')
  const showMACD = activeIndicators.has('macd')

  /* ── 튜토리얼 시작 조건 ─────────────────────────────────────
     · ?onboard=1 쿼리: /tutorial 페이지에서 명시적으로 시작
     · 첫 방문(hasCompletedOnce === false): 자동 시작
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const forceOnboard = searchParams.get('onboard') === '1'
    const lessonKey    = searchParams.get('lesson')
    if (lessonKey) {
      const timer = setTimeout(() => startLesson(lessonKey), 500)
      return () => clearTimeout(timer)
    }
    if (forceOnboard || !hasCompletedOnce) {
      const timer = setTimeout(start, 500)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedOnce, start, startLesson, searchParams])

  /* ── 지표 활성화 감지 → 토스트 + 학습 진행 기록 ──────────── */
  useEffect(() => {
    activeIndicators.forEach(slug => {
      if (!prevInds.current.has(slug)) {
        markIndicator(slug)
        // 처음 시도하는 지표만 토스트 표시
        if (!triedIndicators.includes(slug)) {
          setToastSlug(slug)
        }
      }
    })
    prevInds.current = new Set(activeIndicators)
  }, [activeIndicators]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 작도 도구 감지 → 학습 진행 기록 ──────────────────────── */
  useEffect(() => {
    if (drawingTool !== 'none' && drawingTool !== 'erase') {
      markDrawing()
    }
  }, [drawingTool, markDrawing])

  return (
    <>
      <TutorialManager />
      <IndicatorToast slug={toastSlug} onDone={() => setToastSlug(null)} />

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      {/* 브랜드 > 콘텐츠 순서: NaviSymbol이 NVDA보다 먼저 인식되도록 */}
      <header className="sticky top-0 z-30 bg-navi-bg/94 backdrop-blur-md border-b border-navi-border"
              style={{ height: 52 }}>
        <div className="h-full max-w-5xl mx-auto px-4 flex items-center justify-between">

          {/* 브랜드 영역 — 심볼 크기 확대 (w-8 = 32px, 기존 20px 대비 1.6×) */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center"
              aria-label="NAVI 홈으로"
            >
              <NaviSymbol className="w-8 h-8 text-navi-text group-hover:text-navi-action transition-colors duration-200" />
            </Link>
            <div className="w-px h-5 bg-navi-border2" />
            {/* 종목 — 브랜드보다 낮은 위계로 표시 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold text-navi-secondary tracking-tight">NVDA</span>
              <span className="text-[10px] text-quiet-35">NASDAQ</span>
            </div>
          </div>

          {/* 액션 영역 */}
          <div className="flex items-center gap-2">
            {/* 실전 챌린지 — 모바일에서는 숨김 (하단 학습 시트에 있음) */}
            <Link
              id="simulate-link"
              href="/simulate"
              className="hidden sm:flex h-7 px-3 text-[11px] font-semibold rounded-lg items-center
                         text-navi-text border border-navi-border2
                         hover:border-navi-action/40 hover:bg-navi-action/[0.06]
                         transition-all duration-150"
            >
              실전 챌린지
            </Link>
            {/* 학습 메뉴 버튼 — 모바일에서는 숨김 (하단 학습 시트 사용) */}
            <div className="hidden sm:block">
              <TutorialMenuButton />
            </div>
            {/* 테마 전환 */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── 메인 컨텐츠 ─────────────────────────────────────────
           모바일: px-3, pb-24 (하단 툴바 높이 확보)
           PC:     px-4, pb-8 ───────────────────────────────── */}
      <div className="min-h-screen px-3 sm:px-4 pt-4 sm:pt-5 pb-24 sm:pb-8 max-w-5xl mx-auto">

        {/* 기간 · 봉 단위 */}
        <div className="mb-2.5 sm:mb-3">
          <PeriodToolbar />
        </div>

        {/* 메인 차트 + 서브 차트 */}
        <div className="bg-navi-surface border border-navi-border rounded-xl p-2 sm:p-3">
          <ChartContainer />
          {showRSI  && <RSIChart />}
          {showMACD && <MACDChart />}
        </div>

        {/* 도구 섹션 — PC 전용 (모바일: 하단 툴바 사용) */}
        <div className="hidden sm:grid mt-3 grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 분석 도구 */}
          <div
            id="analysis-tools-card"
            className="bg-navi-surface border border-navi-border rounded-xl p-4 overflow-visible"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-[0.07em] uppercase text-navi-muted">분석 도구</span>
              <span className="text-[11px] text-navi-muted">클릭하면 차트에 표시돼요</span>
            </div>
            <IndicatorToolbar />
          </div>

          {/* 작도 도구 */}
          <div
            id="drawing-tools-card"
            className="bg-navi-surface border border-navi-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-[0.07em] uppercase text-navi-muted">작도 도구</span>
              <span className="text-[11px] text-navi-muted">차트에 직접 그려봐요</span>
            </div>
            <DrawingToolbar />
          </div>
        </div>

        {/* ── 모바일 전용: 지표 더 알아보기 (가로 스크롤) ──── */}
        <div id="mobile-indicator-links" className="sm:hidden mt-4">
          <p className="text-[10px] font-bold tracking-[0.07em] uppercase text-navi-muted mb-2.5">
            지표 더 알아보기
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              ['rsi',            'RSI'],
              ['macd',           'MACD'],
              ['bollinger',      '볼린저 밴드'],
              ['moving-average', '이동평균선'],
              ['trendline',      '추세선'],
              ['fibonacci',      '피보나치'],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/indicator/${slug}`}
                className="shrink-0 px-3.5 py-2.5 bg-navi-surface border border-navi-border
                           rounded-xl text-[12px] font-medium text-navi-secondary
                           hover:border-navi-accent/40 hover:text-navi-text
                           transition-all duration-150 whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* 지표 설명 링크 — PC 전용 */}
        <div id="indicator-links" className="hidden sm:block mt-5">
          <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-navi-secondary mb-3">
            지표 더 알아보기
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {[
              ['rsi',            'RSI'],
              ['macd',           'MACD'],
              ['bollinger',      '볼린저 밴드'],
              ['moving-average', '이동평균선'],
              ['trendline',      '추세선'],
              ['fibonacci',      '피보나치'],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/indicator/${slug}`}
                className="px-3 py-2.5 bg-navi-surface border border-navi-border
                           rounded-lg text-[12px] font-medium text-navi-secondary
                           hover:border-navi-accent/40 hover:text-navi-text hover:bg-navi-surface2
                           transition-all duration-150 text-center"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* ── 모바일 하단 툴바 (sm 미만에서만 표시) ─────────────── */}
      <div className="sm:hidden">
        <MobileBottomBar />
      </div>
    </>
  )
}

export default function ChartPage() {
  return (
    <Suspense>
      <ChartPageInner />
    </Suspense>
  )
}
