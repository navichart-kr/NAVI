'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { useChartStore }    from '@/stores/chartStore'
import { useTutorialStore } from '@/stores/tutorialStore'
import { calcBollingerBands, calcMA } from '@/lib/indicators'
import { chartSync } from '@/lib/chartSync'
import { useTheme }  from '@/hooks/useTheme'
import { getChartColors } from '@/lib/chartColors'

type LineSeries = ISeriesApi<'Line'>

const FIB_LEVELS = [
  { ratio: 0,     label: '0%',    color: '#8892AA' },
  { ratio: 0.236, label: '23.6%', color: '#60a5fa' },
  { ratio: 0.382, label: '38.2%', color: '#34d399' },
  { ratio: 0.5,   label: '50%',   color: '#fbbf24' },
  { ratio: 0.618, label: '61.8%', color: '#f97316' },
  { ratio: 0.786, label: '78.6%', color: '#f472b6' },
  { ratio: 1,     label: '100%',  color: '#8892AA' },
]

/** 모바일(<640px): 300px / PC: 440px */
function getChartH() {
  if (typeof window === 'undefined') return 440
  return window.innerWidth < 640 ? 300 : 440
}

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const bbRef = useRef<{ upper: LineSeries; middle: LineSeries; lower: LineSeries } | null>(null)
  const maRef = useRef<{ ma5: LineSeries; ma20: LineSeries; ma60: LineSeries; ma120: LineSeries } | null>(null)

  const drawnLinesRef   = useRef<LineSeries[]>([])
  const pendingPointRef = useRef<{ time: Time; price: number } | null>(null)
  // 피보나치 레벨 데이터 (HTML 오버레이 레이블용)
  const fibLevelsRef    = useRef<{ value: number; label: string; color: string }[]>([])
  // HTML 피보나치 레이블 (React state → re-render로 표시)
  const [fibLabels, setFibLabels] = useState<{ value: number; label: string; color: string; y: number }[]>([])

  // ── 학습 하이라이트 캔들 박스 위치 (HTML 오버레이) ──────────
  const [candleHL, setCandleHL] = useState<{
    x: number; yTop: number; yBot: number; w: number
    prevX?: number; prevYTop?: number; prevYBot?: number
  } | null>(null)

  // ── 최신값을 ref에 동기화 (stale closure 방지) ────────
  const drawingToolRef  = useRef(useChartStore.getState().drawingTool)
  const candleDataRef   = useRef(useChartStore.getState().candleData)
  // 학습 하이라이트 재계산 함수 ref (chart subscribe에서 호출)
  const computeCandleHLRef = useRef<() => void>(() => {})
  // candleData 참조 변경 여부 추적 (fitContent를 데이터 변경 시에만 호출)
  const prevCandleRef   = useRef(useChartStore.getState().candleData)

  const {
    candleData, isLoading, error,
    activeIndicators,
    drawingTool, drawingStep,
    setDrawingTool, setDrawingStep,
    clearDrawingsSignal,
    learningHighlight,
  } = useChartStore()

  const { focusBarsFromEnd, currentStep } = useTutorialStore()
  const { isDark } = useTheme()

  // ref를 항상 최신 상태로 유지
  useEffect(() => { drawingToolRef.current = drawingTool }, [drawingTool])
  useEffect(() => { candleDataRef.current  = candleData  }, [candleData])

  // ── Canvas 동기화 ─────────────────────────────────────
  const syncCanvas = useCallback(() => {
    const c = canvasRef.current, el = containerRef.current
    if (!c || !el) return
    c.width  = el.clientWidth
    c.height = getChartH()
  }, [])

  useEffect(() => {
    syncCanvas()
    window.addEventListener('resize', syncCanvas)
    return () => window.removeEventListener('resize', syncCanvas)
  }, [syncCanvas])

  // 피보나치 레이블 y좌표 재계산 → React state 업데이트 (HTML 오버레이에 반영)
  const updateFibLabels = useCallback(() => {
    const series = candleRef.current
    if (!series || fibLevelsRef.current.length === 0) { setFibLabels([]); return }
    setFibLabels(
      fibLevelsRef.current
        .map(lv => ({ ...lv, y: series.priceToCoordinate(lv.value) ?? -999 }))
        .filter(lv => lv.y >= 2 && lv.y <= getChartH() - 2)
    )
  }, [])

  // ── 피보나치 작도 가이드 마커 (저점·고점 펄스 표시) ──────
  const [fibGuideMarkers, setFibGuideMarkers] = useState<{
    low:  { x: number; y: number }
    high: { x: number; y: number }
  } | null>(null)

  const updateFibGuideMarkers = useCallback(() => {
    const { currentStep: step } = useTutorialStore.getState()
    const guide = step?.fibGuide
    if (!guide || !chartRef.current || !candleRef.current || !containerRef.current) {
      setFibGuideMarkers(null)
      return
    }
    const xLow  = chartRef.current.timeScale().timeToCoordinate(guide.lowDate  as any)
    const yLow  = candleRef.current.priceToCoordinate(guide.lowPrice)
    const xHigh = chartRef.current.timeScale().timeToCoordinate(guide.highDate as any)
    const yHigh = candleRef.current.priceToCoordinate(guide.highPrice)
    const w     = containerRef.current.clientWidth

    if (xLow  !== null && yLow  !== null &&
        xHigh !== null && yHigh !== null &&
        xLow  > 0 && xLow  < w &&
        xHigh > 0 && xHigh < w) {
      setFibGuideMarkers({
        low:  { x: Math.round(xLow),  y: Math.round(yLow)  },
        high: { x: Math.round(xHigh), y: Math.round(yHigh) },
      })
    } else {
      setFibGuideMarkers(null)
    }
  }, [])

  // clearCanvas: 캔버스 완전 초기화 (피보나치는 HTML로 관리하므로 canvas 그리기 불필요)
  const clearCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
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

    const cc = getChartColors(isDark)
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: cc.bg },
        textColor: cc.text,
      },
      grid: {
        vertLines: { color: cc.grid },
        horzLines: { color: cc.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: cc.border },
      timeScale: {
        borderColor: cc.border,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: containerRef.current.clientWidth,
      height: getChartH(),
    })

    const series = chart.addCandlestickSeries({
      upColor: cc.candleUp, downColor: cc.candleDown,
      borderUpColor: cc.candleUp, borderDownColor: cc.candleDown,
      wickUpColor: cc.candleUp, wickDownColor: cc.candleDown,
    })

    chartRef.current  = chart
    candleRef.current = series

    // 메인 차트를 chartSync에 등록 → RSI/MACD 서브 차트에 범위 전파
    chartSync.register(chart)

    // 스크롤/줌 시 피보나치 레이블 + 가이드 마커 + 학습 하이라이트 재계산
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      updateFibLabels()
      updateFibGuideMarkers()
      computeCandleHLRef.current()
    })

    // 튜토리얼 캔들 클릭 감지 (drawingTool 상태와 무관하게 항상 활성)
    chart.subscribeClick((params) => {
      const tut = useTutorialStore.getState()
      if (!tut.isActive || tut.currentStep?.actionRequired !== 'candle-click') return
      if (!params.time) return
      const clickedTime = String(params.time)
      const d = candleDataRef.current.find(c => c.time === clickedTime)
      if (d) tut.notifyCandleClick(d)
    })

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: getChartH(),
        })
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
  }, [syncCanvas, updateFibLabels, updateFibGuideMarkers])

  // ── 페이지 스크롤 시 학습 하이라이트 뷰포트 좌표 재계산 ─────
  // (차트 팬/줌은 timeRangeChange에서 처리, 스크롤은 여기서 처리)
  useEffect(() => {
    const onScroll = () => computeCandleHLRef.current()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── clearDrawingsSignal 감지 → 모든 작도 제거 ───────
  useEffect(() => {
    if (!clearDrawingsSignal) return
    const chart = chartRef.current
    if (!chart) return

    // 추세선·피보나치 선 전부 제거
    drawnLinesRef.current.forEach(s => { try { chart.removeSeries(s) } catch {} })
    drawnLinesRef.current = []
    pendingPointRef.current = null
    fibLevelsRef.current = []
    setFibLabels([])
    clearCanvas()
    setDrawingStep(0)

    // clearDrawings 이후 적용할 도구가 예약돼 있으면 그것을 사용, 없으면 'none'으로 리셋
    const { drawingToolAfterClear, setDrawingToolAfterClear } = useChartStore.getState()
    if (drawingToolAfterClear) {
      setDrawingTool(drawingToolAfterClear)
      setDrawingToolAfterClear(null)
    } else {
      setDrawingTool('none')
    }
  }, [clearDrawingsSignal, clearCanvas, setDrawingStep, setDrawingTool])

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
        const cc2 = getChartColors(isDark)
        const mk = (color: string, dash = false) => chart.addLineSeries({
          color, lineWidth: 1, lineStyle: dash ? 2 : 0,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        })
        bbRef.current = { upper: mk(cc2.bbBand), middle: mk(cc2.bbMid, true), lower: mk(cc2.bbBand) }
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
        const cc2 = getChartColors(isDark)
        const mkMA = (color: string) =>
          chart.addLineSeries({ color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
        maRef.current = {
          ma5:   mkMA(cc2.ma5),
          ma20:  mkMA(cc2.ma20),
          ma60:  mkMA(cc2.ma60),
          ma120: mkMA(cc2.ma120),
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

  // ── 튜토리얼 차트 포커스 — 마지막 N봉이 보이도록 줌 ────────
  useEffect(() => {
    if (!focusBarsFromEnd || !chartRef.current || candleData.length === 0) return
    const n = candleData.length
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: Math.max(0, n - focusBarsFromEnd - 1),
      to:   n + 3,
    })
  }, [focusBarsFromEnd, candleData.length])

  // ── 학습 하이라이트 — 줌 + HTML 캔들 박스 ──────────────────
  useEffect(() => {
    const chart  = chartRef.current
    const candle = candleRef.current
    if (!chart || !candle || !candleData.length) { setCandleHL(null); return }

    if (!learningHighlight) {
      setCandleHL(null)
      useChartStore.getState().setHighlightViewportBox(null)
      return
    }

    const { candleIndex, prevCandleIndex, windowFrom, windowTo } = learningHighlight

    // 줌: volume / candle 모두 동일하게 해당 구간으로 이동
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, windowFrom - 2),
      to:   Math.min(candleData.length - 1, windowTo + 2),
    })

    // volume 타입: 캔들 amber 박스 불필요 — 거래량 차트(#volume-chart)가 spotlight 담당
    if (learningHighlight.type === 'volume') {
      setCandleHL(null)
      useChartStore.getState().setHighlightViewportBox(null)
      computeCandleHLRef.current = () => {}   // pan/zoom 시에도 재계산 안 함
      return
    }

    // 캔들 박스 계산 함수 (줌/팬 시에도 호출됨)
    const compute = () => {
      const c = candleData[candleIndex]
      if (!c) { setCandleHL(null); return }

      const x = chart.timeScale().timeToCoordinate(c.time as any)
      const yHigh = candle.priceToCoordinate(c.high)
      const yLow  = candle.priceToCoordinate(c.low)
      if (x === null || yHigh === null || yLow === null) { setCandleHL(null); return }

      const logRange = chart.timeScale().getVisibleLogicalRange()
      if (!logRange) { setCandleHL(null); return }
      const visibleBars = Math.max(1, logRange.to - logRange.from)
      const barWidth    = Math.max(6, (containerRef.current?.clientWidth ?? 400) / visibleBars * 0.55)

      const result: typeof candleHL = {
        x:    x - barWidth / 2 - 3,
        yTop: yHigh - 5,
        yBot: yLow  + 5,
        w:    barWidth + 6,
      }

      // 이전 캔들 (장악형)
      if (prevCandleIndex !== undefined && candleData[prevCandleIndex]) {
        const pc = candleData[prevCandleIndex]
        const px  = chart.timeScale().timeToCoordinate(pc.time as any)
        const pyH = candle.priceToCoordinate(pc.high)
        const pyL = candle.priceToCoordinate(pc.low)
        if (px !== null && pyH !== null && pyL !== null) {
          result.prevX    = px - barWidth / 2 - 3
          result.prevYTop = pyH - 5
          result.prevYBot = pyL + 5
        }
      }

      // 뷰포트 좌표 계산 — TutorialStep spotlight + 카드 위치 결정에 사용
      // (장악형 등 2캔들 패턴은 두 캔들을 모두 감싸는 박스로 확장)
      const containerEl = containerRef.current
      if (containerEl) {
        const cr = containerEl.getBoundingClientRect()
        const bLeft   = result.prevX !== undefined ? Math.min(result.x, result.prevX) : result.x
        const bTop    = result.prevYTop !== undefined ? Math.min(result.yTop, result.prevYTop) : result.yTop
        const bRight  = result.prevX !== undefined ? Math.max(result.x + result.w, result.prevX + result.w) : result.x + result.w
        const bBottom = result.prevYBot !== undefined ? Math.max(result.yBot, result.prevYBot) : result.yBot
        useChartStore.getState().setHighlightViewportBox({
          left:   cr.left + bLeft,
          top:    cr.top  + bTop,
          right:  cr.left + bRight,
          bottom: cr.top  + bBottom,
          width:  bRight  - bLeft,
          height: bBottom - bTop,
        })
      } else {
        useChartStore.getState().setHighlightViewportBox(null)
      }

      setCandleHL(result)
    }

    // ref에 등록 (timeRangeChange 핸들러에서 호출)
    computeCandleHLRef.current = compute
    // RAF로 좌표 계산 (줌 완료 후)
    const raf = requestAnimationFrame(() => requestAnimationFrame(compute))
    return () => cancelAnimationFrame(raf)
  }, [learningHighlight, candleData])

  // ── 테마 변경 → 차트 색상 업데이트 (재생성 없이 applyOptions) ─
  useEffect(() => {
    const chart  = chartRef.current
    const candle = candleRef.current
    if (!chart || !candle) return
    const cc = getChartColors(isDark)

    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: cc.bg },
        textColor: cc.text,
      },
      grid: {
        vertLines: { color: cc.grid },
        horzLines: { color: cc.grid },
      },
      rightPriceScale: { borderColor: cc.border },
      timeScale: { borderColor: cc.border },
    })
    candle.applyOptions({
      upColor:        cc.candleUp,  downColor:        cc.candleDown,
      borderUpColor:  cc.candleUp,  borderDownColor:  cc.candleDown,
      wickUpColor:    cc.candleUp,  wickDownColor:    cc.candleDown,
    })
    if (maRef.current) {
      maRef.current.ma5.applyOptions({ color: cc.ma5 })
      maRef.current.ma20.applyOptions({ color: cc.ma20 })
      maRef.current.ma60.applyOptions({ color: cc.ma60 })
      maRef.current.ma120.applyOptions({ color: cc.ma120 })
    }
    if (bbRef.current) {
      bbRef.current.upper.applyOptions({ color: cc.bbBand })
      bbRef.current.middle.applyOptions({ color: cc.bbMid })
      bbRef.current.lower.applyOptions({ color: cc.bbBand })
    }
  }, [isDark])

  // ── 튜토리얼 단계 변경 → 피보나치 가이드 마커 업데이트 ──
  useEffect(() => {
    if (!chartRef.current) return
    // 차트 레이아웃이 자리잡은 뒤 좌표 계산 (2-frame delay)
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => updateFibGuideMarkers())
    )
    return () => cancelAnimationFrame(raf)
  }, [currentStep, updateFibGuideMarkers])

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
      // 피보나치 레이블은 HTML 오버레이로 표시되므로 canvas 재그리기 불필요

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
          const value = priceHigh - range * ratio
          const s = chart.addLineSeries({
            color, lineWidth: 1, lineStyle: 2,
            lastValueVisible: false, priceLineVisible: false,  // 오른쪽 레이블 제거
          })
          s.setData([
            { time: t0, value },
            { time: t1, value },
          ] as any)
          drawnLinesRef.current.push(s)
          fibLevelsRef.current.push({ value, label, color })
        })

        clearCanvas()
        requestAnimationFrame(updateFibLabels)  // 차트 좌표계가 정착된 후 y좌표 계산
        setDrawingStep(0)
        setDrawingTool('none')
      }
    }
  }, [setDrawingTool, setDrawingStep, clearCanvas, drawDot, updateFibLabels])
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
      fibLevelsRef.current = []
      setFibLabels([])   // HTML 레이블 제거
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
        style={{ height: getChartH(), borderRadius: '1rem' }}
      />

      {/* 학습 하이라이트 — 대상 캔들에 amber 박스 오버레이 */}
      {candleHL && (
        <>
          {/* 이전 캔들 (장악형 등 2캔들 패턴) */}
          {candleHL.prevX !== undefined && candleHL.prevYTop !== undefined && candleHL.prevYBot !== undefined && (
            <div
              className="absolute pointer-events-none"
              style={{
                left:            candleHL.prevX,
                top:             candleHL.prevYTop,
                width:           candleHL.w,
                height:          candleHL.prevYBot - candleHL.prevYTop,
                border:          '1.5px dashed rgba(251,191,36,0.55)',
                borderRadius:    2,
                backgroundColor: 'rgba(251,191,36,0.03)',
              }}
            />
          )}
          {/* 메인 캔들 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left:            candleHL.x,
              top:             candleHL.yTop,
              width:           candleHL.w,
              height:          candleHL.yBot - candleHL.yTop,
              border:          '2px solid rgba(251,191,36,0.90)',
              borderRadius:    2,
              backgroundColor: 'rgba(251,191,36,0.06)',
              boxShadow:       '0 0 10px rgba(251,191,36,0.35)',
            }}
          />
        </>
      )}

      {/* 이동평균선 범례 — 켜진 경우만 표시 */}
      {activeIndicators.has('moving-average') && (() => {
        const cc2 = getChartColors(isDark)
        const legend = [
          { label: 'MA5',   color: cc2.ma5   },
          { label: 'MA20',  color: cc2.ma20  },
          { label: 'MA60',  color: cc2.ma60  },
          { label: 'MA120', color: cc2.ma120 },
        ]
        return (
          <div
            className="absolute pointer-events-none select-none flex flex-col gap-1"
            style={{ top: 10, left: 10, zIndex: 10 }}
          >
            {legend.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
                <span style={{ color, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{label}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* 피보나치 레이블 HTML 오버레이 — priceToCoordinate 기반 y좌표, canvas보다 안정적 */}
      {fibLabels.map((lv, i) => (
        <div
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left: 4,
            top: lv.y - 7,
            backgroundColor: lv.color + 'dd',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 3,
            lineHeight: 1.6,
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          {lv.label}
        </div>
      ))}

      {/* ── 피보나치 작도 가이드 마커 (저점·고점 펄스) ────── */}
      {fibGuideMarkers && (
        <>
          {/* ① 저점 — 초록 펄스 (candle 아래) */}
          <div
            className="absolute pointer-events-none select-none flex flex-col items-center"
            style={{ left: fibGuideMarkers.low.x - 10, top: fibGuideMarkers.low.y + 6, zIndex: 46 }}
          >
            <div className="relative w-5 h-5 mb-1">
              <div className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
              <div className="absolute inset-[3px] rounded-full bg-emerald-400" />
            </div>
            <div style={{
              background: 'rgba(16,185,129,0.9)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
            }}>
              ① 저점
            </div>
          </div>

          {/* ② 고점 — 주황 펄스 (candle 위) */}
          <div
            className="absolute pointer-events-none select-none flex flex-col-reverse items-center"
            style={{ left: fibGuideMarkers.high.x - 10, top: fibGuideMarkers.high.y - 46, zIndex: 46 }}
          >
            <div className="relative w-5 h-5 mt-1">
              <div className="absolute inset-0 rounded-full bg-orange-400/50 animate-ping" />
              <div className="absolute inset-[3px] rounded-full bg-orange-400" />
            </div>
            <div style={{
              background: 'rgba(234,88,12,0.9)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
            }}>
              ② 고점
            </div>
          </div>
        </>
      )}

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

      {/* 작도 가이드 토스트 — 피보나치는 0·1 두 단계 모두 안내 */}
      {(drawingTool === 'fibonacci' || (drawingTool === 'trendline' && drawingStep === 1)) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                        flex items-center gap-2 px-3.5 py-1.5
                        bg-amber-500/20 border border-amber-400/50
                        rounded-full pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-amber-300 font-semibold">
            {drawingTool === 'fibonacci' && drawingStep === 0 && '① 상승 시작 저점을 클릭하세요'}
            {drawingTool === 'fibonacci' && drawingStep === 1 && '② 이제 고점을 클릭해서 완성하세요'}
            {drawingTool === 'trendline' && drawingStep === 1 && '끝점을 클릭하세요'}
          </span>
        </div>
      )}
    </div>
  )
}
