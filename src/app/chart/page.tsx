'use client'

import { useEffect, useState, useRef } from 'react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { RSIChart } from '@/components/chart/RSIChart'
import { MACDChart } from '@/components/chart/MACDChart'
import { IndicatorToolbar } from '@/components/chart/IndicatorToolbar'
import { PeriodToolbar } from '@/components/chart/PeriodToolbar'
import { DrawingToolbar } from '@/components/chart/DrawingToolbar'
import { TutorialManager } from '@/components/tutorial/TutorialManager'
import { LearningPath } from '@/components/ui/LearningPath'
import { IndicatorToast } from '@/components/ui/IndicatorToast'
import { RoundedCard } from '@/components/ui/RoundedCard'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useChartStore } from '@/stores/chartStore'
import { useLearnStore } from '@/stores/learnStore'
import { useStockData } from '@/hooks/useStockData'
import Link from 'next/link'

export default function ChartPage() {
  const { hasCompletedOnce, start } = useTutorialStore()
  const { activeIndicators, drawingTool } = useChartStore()
  const { markIndicator, markDrawing, triedIndicators } = useLearnStore()

  /* ─── 첫 지표 활성화 시 컨텍스트 토스트 ─────────────────────── */
  const [toastSlug, setToastSlug] = useState<string | null>(null)
  const prevInds = useRef(new Set<string>())

  // 실제 NVDA 데이터 fetch
  useStockData('NVDA')

  const showRSI  = activeIndicators.has('rsi')
  const showMACD = activeIndicators.has('macd')

  /* ── 튜토리얼 자동 시작 (첫 방문) ─────────────────────────── */
  useEffect(() => {
    if (!hasCompletedOnce) {
      const timer = setTimeout(start, 800)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedOnce, start])

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

      <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-navi-muted text-sm hover:text-navi-text">
            ← 홈
          </Link>
          <div className="text-center">
            <h1 className="text-navi-text font-bold text-sm">NVIDIA Corporation</h1>
            <p className="text-navi-muted text-xs">NVDA · NASDAQ</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/simulate"
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30
                         text-indigo-300 hover:bg-indigo-500/25 transition-colors font-medium"
            >
              🔮 시뮬레이션
            </Link>
            <button onClick={start} className="text-xs text-navi-accent hover:underline">
              튜토리얼
            </button>
          </div>
        </div>

        {/* ── 학습 경로 진행 바 ────────────────────────────────── */}
        <LearningPath />

        {/* 기간 · 봉 단위 */}
        <div className="mb-3">
          <PeriodToolbar />
        </div>

        {/* 메인 차트 + 서브 차트 */}
        <RoundedCard padding="sm">
          <ChartContainer />
          {showRSI  && <RSIChart />}
          {showMACD && <MACDChart />}
        </RoundedCard>

        {/* 도구 섹션 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 분석 도구 */}
          <div
            id="analysis-tools-card"
            className="bg-navi-surface border border-navi-border rounded-2xl p-4 overflow-visible"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-navi-text">분석 도구</span>
              <span className="text-xs text-navi-muted">클릭하면 차트에 표시돼요</span>
            </div>
            <IndicatorToolbar />
          </div>

          {/* 작도 도구 */}
          <div
            id="drawing-tools-card"
            className="bg-navi-surface border border-navi-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-navi-text">작도 도구</span>
              <span className="text-xs text-navi-muted">차트에 직접 그려봐요</span>
            </div>
            <DrawingToolbar />
          </div>
        </div>

        {/* 지표 상세 링크 */}
        <div id="indicator-links" className="mt-6">
          <p className="text-xs text-navi-muted mb-3">지표가 뭔지 더 알아보고 싶다면?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['rsi',            'RSI 설명'],
              ['macd',           'MACD 설명'],
              ['bollinger',      '볼린저 밴드 설명'],
              ['moving-average', '이동평균선 설명'],
              ['trendline',      '추세선 설명'],
              ['fibonacci',      '피보나치 설명'],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/indicator/${slug}`}
                className="px-3 py-2 bg-navi-surface border border-navi-border
                           rounded-xl text-xs text-navi-muted hover:border-navi-accent
                           hover:text-navi-text transition-colors text-center"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
