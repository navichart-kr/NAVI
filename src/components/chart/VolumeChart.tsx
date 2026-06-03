'use client'

/**
 * VolumeChart — 거래량 서브차트 (거래량 학습 활성 시 표시)
 * lightweight-charts HistogramSeries 사용
 * 학습 하이라이트 봉은 amber, 상승봉 파랑, 하락봉 빨강
 */

import { useEffect, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode,
  type IChartApi,
} from 'lightweight-charts'
import { useChartStore }  from '@/stores/chartStore'
import { chartSync }      from '@/lib/chartSync'
import { useTheme }       from '@/hooks/useTheme'
import { getChartColors } from '@/lib/chartColors'

const H = 90   // 차트 높이 (px)

export function VolumeChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)

  const { candleData, learningHighlight } = useChartStore()
  const { isDark } = useTheme()

  // ── 차트 생성 (1회) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const cc = getChartColors(isDark)

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: cc.bg },
        textColor:  cc.text,
      },
      grid: {
        vertLines: { color: cc.grid },
        horzLines: { color: cc.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: cc.border,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderColor: cc.border,
        timeVisible: true,
        fixLeftEdge:  true,
        fixRightEdge: true,
        visible: false,  // RSI와 동일하게 타임스케일 숨김
      },
      width:  containerRef.current.clientWidth,
      height: H,
    })

    // 메인 차트와 시간축 동기화
    chartSync.register(chart)

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', onResize)

    chartRef.current = chart
    return () => {
      window.removeEventListener('resize', onResize)
      chartSync.unregister()
      chart.remove()
      chartRef.current = null
    }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── 데이터 + 하이라이트 동기화 ─────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !candleData.length) return

    const highlightIdx = learningHighlight?.type === 'volume'
      ? learningHighlight.candleIndex
      : -1

    // 기존 시리즈 제거 후 재생성 (색상 변경 가장 간단한 방법)
    // histogramSeries 는 per-bar 색상을 setData 시 직접 지정
    const cc = getChartColors(isDark)
    const series = chart.addHistogramSeries({
      priceFormat:      { type: 'volume' },
      priceScaleId:     'right',
      lastValueVisible: false,
      priceLineVisible: false,
    })

    series.setData(
      candleData.map((c, i) => ({
        time:  c.time as any,
        value: c.volume ?? 0,
        color: i === highlightIdx
          ? '#F59E0B'                       // 하이라이트 봉 (amber)
          : c.close >= c.open
          ? 'rgba(96,165,250,0.55)'         // 상승봉 (파랑)
          : 'rgba(248,113,113,0.55)',        // 하락봉 (빨강)
      }))
    )

    return () => {
      try { chart.removeSeries(series) } catch {}
    }
  }, [candleData, learningHighlight, isDark])

  // ── 테마 업데이트 ──────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const cc = getChartColors(isDark)
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: cc.bg },
        textColor:  cc.text,
      },
      grid: {
        vertLines: { color: cc.grid },
        horzLines: { color: cc.grid },
      },
      rightPriceScale: { borderColor: cc.border },
    })
  }, [isDark])

  return (
    <div className="mt-1 border-t border-navi-border/50">
      <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold tracking-[0.06em] uppercase text-navi-muted">
        거래량
      </p>
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
