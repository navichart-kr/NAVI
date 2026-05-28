'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { calcRSI } from '@/lib/indicators'
import { chartSync } from '@/lib/chartSync'

export function RSIChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { candleData } = useChartStore()

  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#2a2a45' },
        horzLines: { color: '#2a2a45' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: '#2a2a45',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2a2a45',
        visible: false,   // 메인 차트에 날짜가 있으므로 서브 차트는 숨김
      },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 100,
    })

    const rsiData = calcRSI(candleData)

    chart.addLineSeries({
      color: '#a78bfa', lineWidth: 2,
      lastValueVisible: true, priceLineVisible: false,
    }).setData(rsiData as any)

    // 70/30 기준선: 전체 candleData 범위로 확장 (RSI 데이터보다 넓음)
    if (candleData.length > 0) {
      const first = candleData[0].time
      const last  = candleData[candleData.length - 1].time

      chart.addLineSeries({
        color: '#ef4444', lineWidth: 1, lineStyle: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([{ time: first, value: 70 }, { time: last, value: 70 }] as any)

      chart.addLineSeries({
        color: '#22c55e', lineWidth: 1, lineStyle: 2,
        lastValueVisible: false, priceLineVisible: false,
      }).setData([{ time: first, value: 30 }, { time: last, value: 30 }] as any)
    }

    chart.timeScale().fitContent()

    // 메인 차트와 시간(날짜) 기반으로 동기화
    const unsub = chartSync.subscribe((range) => {
      chart.timeScale().setVisibleRange(range)
    })

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      unsub()
      chart.remove()
    }
  }, [candleData])

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 mb-1 px-1">
        <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>RSI (14)</span>
        <span className="text-xs text-red-400">── 70 과매수</span>
        <span className="text-xs text-green-400">── 30 과매도</span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  )
}
