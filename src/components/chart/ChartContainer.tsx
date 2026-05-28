'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { useChartStore } from '@/stores/chartStore'
import { calcBollingerBands, calcMA } from '@/lib/indicators'
import { chartSync } from '@/lib/chartSync'

type LineSeries = ISeriesApi<'Line'>

const FIB_LEVELS = [
  { ratio: 0,     label: '0%',    color: '#94a3b8' },
  { ratio: 0.236, label: '23.6%', color: '#60a5fa' },
  { ratio: 0.382, label: '38.2%', color: '#34d399' },
  { ratio: 0.5,   label: '50%',   color: '#fbbf24' },
  { ratio: 0.618, label: '61.8%', color: '#f97316' },
  { ratio: 0.786, label: '78.6%', color: '#f472b6' },
  { ratio: 1,     label: '100%',  color: '#94a3b8' },
]

const CHART_HEIGHT = 440

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const bbRef = useRef<{ upper: LineSeries; middle: LineSeries; lower: LineSeries } | null>(null)
  const maRef = useRef<{ ma5: LineSeries; ma20: LineSeries; ma60: LineSeries; ma120: LineSeries } | null>(null)

  const drawnLinesRef   = useRef<LineSeries[]>([])
  const pendingPointRef = useRef<{ time: Time; price: number } | null>(null)

  // ── 최신값을 ref에 동기화 (stale closure 방지) ────────
  const drawingToolRef  = useRef(useChartStore.getState().drawingTool)
  const candleDataRef   = useRef(useChartStore.getState().candleData)
  // candleData 참조 변경 여부 추적 (fitContent를 데이터 변경 시에만 호출)
  const prevCandleRef   = useRef(useChartStore.getState().candleData)

  const {
    candleData, isLoading, error,
    activeIndicators,
    drawingTool, drawingStep,
    setDrawingTool, setDrawingStep,
  } = useChartStore()

  // ref를 항상 최신 상태로 유지
  useEffect(() => { drawingToolRef.current = drawingTool }, [drawingTool])
  useEffect(() => { candleDataRef.current  = candleData  }, [candleData])

  // ── Canvas 동기화 ─────────────────────────────────────
  const syncCanvas = useCallback(() => {
    const c = canvasRef.current, el = containerRef.current
    if (!c || !el) return
    c.width  = el.clientWidth
    c.height = CHART_HEIGHT
  }, [])

  useEffect(() => {
    syncCanvas()
    window.addEventListener('resize', syncCanvas)
    return () => window.removeEventListener('resize', syncCanvas)
  }, [syncCanvas])

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }, [])

  // ── 점 그리기 헬퍼 ────────────────────────────────────
  const drawDot = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    color = '#6c63ff'
  ) => {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }, [])

  // ── 차트 생성 (1회) ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

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
      rightPriceScale: { borderColor: '#2a2a45' },
      timeScale: {
        borderColor: '#2a2a45',
        timeVisible: true,
        fixLeftEdge: true,   // 데이터 시작 이전으로 스크롤 방지
        fixRightEdge: true,  // 데이터 끝 이후로 스크롤 방지 → RSI/MACD 선 연장 현상 해소
      },
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })

    chartRef.current  = chart
    candleRef.current = series

    // 메인 차트를 chartSync에 등록 → RSI/MACD 서브 차트에 범위 전파
    chartSync.register(chart)

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
        syncCanvas()
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chartSync.unregister()
      chart.remove()
      chartRef.current = null; candleRef.current = null
      bbRef.current = null;    maRef.current = null
    }
  }, [syncCanvas])

  // ── 데이터 · 지표 동기화 ─────────────────────────────
  useEffect(() => {
    const chart = chartRef.current, candle = candleRef.current
    if (!chart || !candle || candleData.length === 0) return

    // fitContent는 실제 데이터가 바뀔 때만 호출
    // (지표 토글 시에는 호출하지 않아 줌 유지)
    const isNewData = candleData !== prevCandleRef.current
    prevCandleRef.current = candleData

    // 데이터가 실제로 바뀔 때만 setData 호출.
    // 지표 토글 시에는 activeIndicators만 변하므로 candleData 참조는 동일 →
    // setData를 불필요하게 호출하면 lightweight-charts가 렌더링 파이프라인을
    // 리셋하면서 removeSeries와 타이밍 충돌 → 캔들 차트가 순간 사라지는 버그.
    if (isNewData) {
      candle.setData(candleData as any)
      chart.timeScale().fitContent()
    }

    // 볼린저 밴드
    if (activeIndicators.has('bollinger')) {
      const { upper, middle, lower } = calcBollingerBands(candleData)
      if (!bbRef.current) {
        const mk = (color: string, dash = false) => chart.addLineSeries({
          color, lineWidth: 1, lineStyle: dash ? 2 : 0,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        })
        bbRef.current = { upper: mk('#60a5fa'), middle: mk('#94a3b8', true), lower: mk('#60a5fa') }
      }
      bbRef.current.upper.setData(upper as any)
      bbRef.current.middle.setData(middle as any)
      bbRef.current.lower.setData(lower as any)
    } else if (bbRef.current) {
      chart.removeSeries(bbRef.current.upper)
      chart.removeSeries(bbRef.current.middle)
      chart.removeSeries(bbRef.current.lower)
      bbRef.current = null
    }

    // 이동평균선 (MA5 · MA20 · MA60 · MA120)
    if (activeIndicators.has('moving-average')) {
      const ma5d   = calcMA(candleData, 5)
      const ma20d  = calcMA(candleData, 20)
      const ma60d  = calcMA(candleData, 60)
      const ma120d = calcMA(candleData, 120)
      if (!maRef.current) {
        const mkMA = (color: string) =>
          chart.addLineSeries({ color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
        maRef.current = {
          ma5:   mkMA('#facc15'),  // 노랑  — 단기
          ma20:  mkMA('#f97316'),  // 주황  — 단기~중기
          ma60:  mkMA('#a78bfa'),  // 보라  — 중기
          ma120: mkMA('#f43f5e'),  // 빨강  — 장기
        }
      }
      maRef.current.ma5.setData(ma5d     as any)
      maRef.current.ma20.setData(ma20d   as any)
      maRef.current.ma60.setData(ma60d   as any)
      maRef.current.ma120.setData(ma120d as any)
    } else if (maRef.current) {
      chart.removeSeries(maRef.current.ma5)
      chart.removeSeries(maRef.current.ma20)
      chart.removeSeries(maRef.current.ma60)
      chart.removeSeries(maRef.current.ma120)
      maRef.current = null
    }
  }, [candleData, activeIndicators])

  // ── Crosshair move → Canvas rubber-band (루프 없음) ───
  useEffect(() => {
    const chart  = chartRef.current
    const series = candleRef.current
    if (!chart || !series) return

    if (drawingTool !== 'trendline' && drawingTool !== 'fibonacci') {
      clearCanvas()
      return
    }

    const onMove = (params: MouseEventParams<Time>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pending = pendingPointRef.current
      if (!pending || !params.point) return

      const x1 = chart.timeScale().timeToCoordinate(pending.time)
      const y1 = series.priceToCoordinate(pending.price)
      if (x1 === null || y1 === null) return

      const { x: x2, y: y2 } = params.point

      // 점선 미리보기
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = 'rgba(108,99,255,0.75)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.restore()

      // 첫 번째 점 마커
      const dotColor = drawingTool === 'fibonacci' ? '#f97316' : '#6c63ff'
      drawDot(ctx, x1, y1, dotColor)

      // 현재 마우스 위치 소점
      ctx.save()
      ctx.beginPath()
      ctx.arc(x2, y2, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(108,99,255,0.5)'
      ctx.fill()
      ctx.restore()
    }

    chart.subscribeCrosshairMove(onMove)
    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      clearCanvas()
    }
  }, [drawingTool, clearCanvas, drawDot])

  // ── 클릭 핸들러 (ref 기반 → stale closure 없음) ──────
  // drawingTool / candleData 를 ref 로 읽기 때문에
  // handleClick 이 불필요하게 재생성되지 않음
  const handleClick = useCallback((params: MouseEventParams<Time>) => {
    const tool   = drawingToolRef.current
    const data   = candleDataRef.current
    const chart  = chartRef.current
    const series = candleRef.current
    if (!chart || !series || !params.point || !params.time) return

    const price = series.coordinateToPrice(params.point.y)
    if (price === null) return
    const time = params.time

    const drawFirstDot = (color: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const px  = chart.timeScale().timeToCoordinate(time)
      const py  = series.priceToCoordinate(price)
      if (ctx && px !== null && py !== null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawDot(ctx, px, py, color)
      }
    }

    // ── 추세선 ────────────────────────────────────────
    if (tool === 'trendline') {
      if (!pendingPointRef.current) {
        pendingPointRef.current = { time, price }
        setDrawingStep(1)
        drawFirstDot('#6c63ff')
      } else {
        const start = pendingPointRef.current
        pendingPointRef.current = null

        const s = chart.addLineSeries({
          color: '#6c63ff', lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false,
        })
        const pts = String(start.time) < String(time)
          ? [{ time: start.time, value: start.price }, { time, value: price }]
          : [{ time, value: price }, { time: start.time, value: start.price }]
        s.setData(pts as any)
        drawnLinesRef.current.push(s)

        clearCanvas()
        setDrawingStep(0)
        setDrawingTool('none')
      }
    }

    // ── 피보나치 ──────────────────────────────────────
    if (tool === 'fibonacci') {
      if (!pendingPointRef.current) {
        pendingPointRef.current = { time, price }
        setDrawingStep(1)
        drawFirstDot('#f97316')
      } else {
        const start = pendingPointRef.current
        pendingPointRef.current = null

        const priceHigh = Math.max(start.price, price)
        const priceLow  = Math.min(start.price, price)
        const range     = priceHigh - priceLow
        const t0 = (data.length > 0 ? data[0].time           : time) as Time
        const t1 = (data.length > 0 ? data[data.length - 1].time : time) as Time

        FIB_LEVELS.forEach(({ ratio, label, color }) => {
          const s = chart.addLineSeries({
            color, lineWidth: 1, lineStyle: 2,
            title: label,
            lastValueVisible: true, priceLineVisible: false,
          })
          s.setData([
            { time: t0, value: priceHigh - range * ratio },
            { time: t1, value: priceHigh - range * ratio },
          ] as any)
          drawnLinesRef.current.push(s)
        })

        clearCanvas()
        setDrawingStep(0)
        setDrawingTool('none')
      }
    }
  }, [setDrawingTool, setDrawingStep, clearCanvas, drawDot])
  // ↑ drawingTool / candleData 가 deps 에 없음 → ref 로 읽으므로 안정적

  // ── 클릭 구독 — drawingTool 변경 시만 재구독 ─────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // 지우기
    if (drawingTool === 'erase') {
      drawnLinesRef.current.forEach(s => { try { chart.removeSeries(s) } catch {} })
      drawnLinesRef.current = []
      pendingPointRef.current = null
      clearCanvas()
      setDrawingStep(0)
      setDrawingTool('none')
      return
    }

    if (drawingTool === 'none') return

    chart.subscribeClick(handleClick)
    return () => chart.unsubscribeClick(handleClick)
  }, [drawingTool, handleClick, setDrawingTool, setDrawingStep, clearCanvas])

  const cursor = (drawingTool === 'trendline' || drawingTool === 'fibonacci')
    ? 'crosshair' : 'default'

  return (
    <div className="relative">
      <div
        id="chart-area"
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ cursor }}
      />

      {/* 작도 미리보기 캔버스 — pointer-events:none 이므로 차트 조작 영향 없음 */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ height: CHART_HEIGHT, borderRadius: '1rem' }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center
                        bg-navi-surface/80 rounded-2xl backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-navi-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-navi-muted">실시간 데이터 불러오는 중...</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-navi-surface/90 rounded-2xl z-20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {drawingStep === 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                        flex items-center gap-2 px-3.5 py-1.5
                        bg-amber-500/20 border border-amber-400/50
                        rounded-full pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-amber-300 font-medium">
            {drawingTool === 'trendline' && '끝점을 클릭하세요'}
            {drawingTool === 'fibonacci' && '반대 끝점을 클릭하세요'}
          </span>
        </div>
      )}
    </div>
  )
}
