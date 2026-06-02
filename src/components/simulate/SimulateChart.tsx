'use client'

/**
 * 시뮬레이션 메인 차트
 *
 * phase 'analyzing' : pastData 만 표시 + 노란 수직 점선(예측 시작점)
 * phase 'predicting': 예측 선택 UI
 * phase 'revealed'  : pastData + futureData 표시 + 결과 + 디브리핑 카드
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart, ColorType, CrosshairMode,
  type IChartApi, type ISeriesApi, type MouseEventParams, type Time,
} from 'lightweight-charts'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import { useLearnStore } from '@/stores/learnStore'
import { trackEvent, getDeviceType } from '@/lib/analytics'
import type { CandleData } from '@/types'
import { clsx } from 'clsx'
import { useTheme } from '@/hooks/useTheme'
import { getChartColors } from '@/lib/chartColors'

/* ─── 로컬 타입 ─────────────────────────────────────────────── */
type Phase    = 'analyzing' | 'predicting' | 'revealed'
type Choice   = 'up' | 'down' | 'sideways'
type DrawTool = 'none' | 'trendline' | 'fibonacci' | 'erase'
type LineS    = ISeriesApi<'Line'>
type HistS    = ISeriesApi<'Histogram'>

interface Signal {
  name:   string
  icon:   string
  type:   'bullish' | 'bearish' | 'neutral'
  label:  string
  detail: string
}

/* ─── 상수 ──────────────────────────────────────────────────── */
const FIB_LEVELS = [
  { ratio: 0,     color: '#8892AA', label: '0%'    },
  { ratio: 0.236, color: '#60a5fa', label: '23.6%' },
  { ratio: 0.382, color: '#34d399', label: '38.2%' },
  { ratio: 0.5,   color: '#fbbf24', label: '50%'   },
  { ratio: 0.618, color: '#f97316', label: '61.8%' },
  { ratio: 0.786, color: '#f472b6', label: '78.6%' },
  { ratio: 1,     color: '#8892AA', label: '100%'  },
]
const MAIN_H = 340
const SUB_H  = 110

/* ─── 분석 도구 버튼 정의 ────────────────────────────────────── */
const INDICATOR_BTNS = [
  { key: 'moving-average', label: 'MA',   desc: '이동평균선' },
  { key: 'bollinger',      label: 'BB',   desc: '볼린저 밴드' },
  { key: 'rsi',            label: 'RSI',  desc: 'RSI' },
  { key: 'macd',           label: 'MACD', desc: 'MACD' },
] as const

/* ─── 지표 신호 분석 — 항상 4개 전체 분석 ──────────────────── */
function analyzeSignals(data: CandleData[]): Signal[] {
  const signals: Signal[] = []
  if (data.length < 30) return signals
  const lastClose = data[data.length - 1].close

  // ── MA ──
  const ma20 = calcMA(data, 20)
  const ma60 = calcMA(data, 60)
  const last20 = ma20[ma20.length - 1]?.value
  const last60 = ma60[ma60.length - 1]?.value
  if (last20 !== undefined && last60 !== undefined) {
    const lb = Math.min(10, ma20.length - 2)
    const prev20 = ma20[ma20.length - 1 - lb]?.value ?? last20
    const prev60 = ma60[ma60.length - 1 - lb]?.value ?? last60
    const currAbove = last20 > last60
    const prevAbove = prev20 > prev60
    if (!prevAbove && currAbove) {
      signals.push({ name: 'MA', icon: 'MA', type: 'bullish', label: '골든 크로스 발생', detail: 'MA20이 MA60을 위로 돌파 → 상승 전환 신호였어요' })
    } else if (prevAbove && !currAbove) {
      signals.push({ name: 'MA', icon: 'MA', type: 'bearish', label: '데드 크로스 발생', detail: 'MA20이 MA60 아래로 교차 → 하락 전환 신호였어요' })
    } else if (currAbove) {
      signals.push({ name: 'MA', icon: 'MA', type: 'bullish', label: '상승 추세 유지', detail: `MA20($${last20.toFixed(0)})이 MA60($${last60.toFixed(0)}) 위 → 상승 흐름이었어요` })
    } else {
      signals.push({ name: 'MA', icon: 'MA', type: 'bearish', label: '하락 추세', detail: `MA20($${last20.toFixed(0)})이 MA60($${last60.toFixed(0)}) 아래 → 하락 흐름이었어요` })
    }
  }

  // ── RSI ──
  const rsiData = calcRSI(data)
  const lastRSI = rsiData[rsiData.length - 1]?.value
  if (lastRSI !== undefined) {
    if (lastRSI >= 70) {
      signals.push({ name: 'RSI', icon: 'RSI', type: 'bearish', label: `${lastRSI.toFixed(0)} — 과매수`, detail: '70 이상 과열 상태 → 조정 가능성이 있었어요' })
    } else if (lastRSI <= 30) {
      signals.push({ name: 'RSI', icon: 'RSI', type: 'bullish', label: `${lastRSI.toFixed(0)} — 과매도`, detail: '30 이하 침체 상태 → 반등 가능성이 있었어요' })
    } else {
      const sub = lastRSI > 50 ? '강세 기조' : '약세 기조'
      signals.push({ name: 'RSI', icon: 'RSI', type: 'neutral', label: `${lastRSI.toFixed(0)} — 중립`, detail: `중립 구간 (${sub}) → 확실한 방향 신호가 없었어요` })
    }
  }

  // ── MACD ──
  const md    = calcMACD(data)
  const valid = md.filter(d => d.signal !== null)
  if (valid.length >= 5) {
    const last  = valid[valid.length - 1]
    const prev  = valid[valid.length - 5]
    const cAbove = last.macd > (last.signal ?? 0)
    const pAbove = prev.macd > (prev.signal ?? 0)
    if (!pAbove && cAbove) {
      signals.push({ name: 'MACD', icon: 'MACD', type: 'bullish', label: '상향 교차 (매수 신호)', detail: 'MACD선이 시그널선을 위로 돌파 → 매수 신호가 발생했어요' })
    } else if (pAbove && !cAbove) {
      signals.push({ name: 'MACD', icon: 'MACD', type: 'bearish', label: '하향 교차 (매도 신호)', detail: 'MACD선이 시그널선 아래로 교차 → 매도 신호가 발생했어요' })
    } else if (cAbove) {
      signals.push({ name: 'MACD', icon: 'MACD', type: 'bullish', label: '상승 모멘텀', detail: 'MACD선이 시그널선 위 → 상승 흐름이 유지되고 있었어요' })
    } else {
      signals.push({ name: 'MACD', icon: 'MACD', type: 'bearish', label: '하락 모멘텀', detail: 'MACD선이 시그널선 아래 → 하락 압력이 있었어요' })
    }
  }

  // ── BB ──
  const bb     = calcBollingerBands(data)
  const upper  = bb.upper[bb.upper.length - 1]?.value
  const middle = bb.middle[bb.middle.length - 1]?.value
  const lower  = bb.lower[bb.lower.length - 1]?.value
  if (upper !== undefined && lower !== undefined && middle !== undefined) {
    const range = upper - lower
    const bwPct = middle > 0 ? (range / middle) * 100 : 0
    if (lastClose > upper) {
      signals.push({ name: 'BB', icon: 'BB', type: 'bearish', label: '상단 밴드 돌파', detail: `가격($${lastClose.toFixed(0)})이 상단 밴드($${upper.toFixed(0)}) 위 → 과매수 가능성이 있었어요` })
    } else if (lastClose < lower) {
      signals.push({ name: 'BB', icon: 'BB', type: 'bullish', label: '하단 밴드 이탈', detail: `가격($${lastClose.toFixed(0)})이 하단 밴드($${lower.toFixed(0)}) 아래 → 과매도 가능성이 있었어요` })
    } else {
      const pos = Math.round(((lastClose - lower) / range) * 100)
      const bwDesc = bwPct < 4 ? '매우 좁음 — 큰 움직임 예고' : bwPct < 8 ? '보통' : '넓음'
      signals.push({ name: 'BB', icon: 'BB', type: 'neutral', label: `밴드 ${pos}% 위치 (폭: ${bwDesc})`, detail: bwPct < 4 ? '밴드가 매우 좁아졌어요 → 곧 큰 변동이 올 수 있었어요' : `밴드 내 ${pos}% 위치에서 마감했어요` })
    }
  }

  return signals
}

/* ─── 예측 정확성 판단 ───────────────────────────────────────── */
function isCorrect(choice: Choice, change: number): boolean {
  if (choice === 'up')       return change > 5
  if (choice === 'down')     return change < -5
  if (choice === 'sideways') return change >= -5 && change <= 5
  return false
}

/* ─── Props ─────────────────────────────────────────────────── */
interface Props {
  pastData:   CandleData[]
  futureData: CandleData[]
  onRetry:    () => void
}

/* ─── 헬퍼: canvas roundRect ────────────────────────────────── */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/* ═══════════════════════════════════════════════════════════════
   컴포넌트
═══════════════════════════════════════════════════════════════ */
export function SimulateChart({ pastData, futureData, onRetry }: Props) {
  const { markSim } = useLearnStore()
  const { isDark } = useTheme()

  /* ── DOM refs ─────────────────────────────────────────────── */
  const mainRef   = useRef<HTMLDivElement>(null)
  const rsiDiv    = useRef<HTMLDivElement>(null)
  const macdDiv   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* ── 차트 / 시리즈 refs ──────────────────────────────────── */
  const chartRef    = useRef<IChartApi | null>(null)
  const candleRef   = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const bbRef       = useRef<{ upper: LineS; middle: LineS; lower: LineS } | null>(null)
  const maRef       = useRef<{ ma5: LineS; ma20: LineS; ma60: LineS; ma120: LineS } | null>(null)
  const rsiChart    = useRef<IChartApi | null>(null)
  const rsiSeries   = useRef<{ line: LineS; ob: LineS; os: LineS } | null>(null)
  const macdChart   = useRef<IChartApi | null>(null)
  const macdSeries  = useRef<{ hist: HistS; line: LineS; signal: LineS } | null>(null)

  /* ── 작도 refs ────────────────────────────────────────────── */
  const drawnRef    = useRef<LineS[]>([])
  const pendingRef  = useRef<{ time: Time; price: number } | null>(null)
  const mouseRef    = useRef<{ x: number; y: number } | null>(null)
  const toolRef     = useRef<DrawTool>('none')
  const revRef      = useRef(false)
  // 피보나치 레벨 데이터 저장 (HTML 오버레이 레이블용)
  const fibLevelsRef = useRef<{ value: number; label: string; color: string }[]>([])
  // HTML 피보나치 레이블 state (React re-render로 표시)
  const [fibLabels, setFibLabels] = useState<{ value: number; label: string; color: string; y: number }[]>([])

  /* ── 데이터 변경 추적 (MA/BB toggle 시 setData 재호출 방지) ── */
  const prevPastRef     = useRef<CandleData[] | null>(null)
  const prevRevealedRef = useRef<boolean>(false)

  /* ── State ────────────────────────────────────────────────── */
  const [phase,          setPhase]         = useState<Phase>('analyzing')
  const [prediction,     setPrediction]    = useState<Choice | null>(null)
  const [debriefSignals, setDebriefSignals] = useState<Signal[]>([])
  const [revealed,       setRevealed]      = useState(false)
  const [drawTool,       _setTool]         = useState<DrawTool>('none')
  const [drawStep,       setDrawStep]      = useState<0 | 1>(0)
  const [activeInds,     setActiveInds]    = useState(new Set<string>())
  const [result, setResult] = useState<{
    change: number; startPrice: number; endPrice: number; days: number
  } | null>(null)

  /* ── ref 동기화 ──────────────────────────────────────────── */
  const setTool    = useCallback((t: DrawTool) => { toolRef.current = t; _setTool(t) }, [])
  const toggleInd  = useCallback((k: string) =>
    setActiveInds(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s }), [])

  /* ── 실전 챌린지 페이지 진입 이벤트 ─────────────────────────── */
  useEffect(() => {
    trackEvent('simulation_started', {
      device_type: getDeviceType(),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 작도 도구 활성화 시 차트 스크롤 ────────────────────────── */
  useEffect(() => {
    const isDrawing = drawTool === 'trendline' || drawTool === 'fibonacci'
    if (!isDrawing) return
    const el = mainRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight * 0.75) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [drawTool])

  /* ══ 캔버스 헬퍼 ════════════════════════════════════════════ */
  const syncCanvas = useCallback(() => {
    const c = canvasRef.current, el = mainRef.current
    if (!c || !el) return
    c.width = el.clientWidth; c.height = MAIN_H
  }, [])

  const drawCutoff = useCallback((ctx: CanvasRenderingContext2D, chart: IChartApi) => {
    if (revRef.current || pastData.length === 0) return
    const x = chart.timeScale().timeToCoordinate(pastData[pastData.length - 1].time as Time)
    if (x === null || x < 0 || x > ctx.canvas.width + 50) return
    ctx.save()
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, MAIN_H)
    ctx.strokeStyle = 'rgba(251,191,36,0.65)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.setLineDash([])
    const lw = 74, lh = 18
    const lx = Math.min(Math.max(x - lw / 2, 2), ctx.canvas.width - lw - 2)
    const ly = 10
    ctx.fillStyle = 'rgba(20,18,10,0.82)'
    ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 1
    ctx.beginPath(); rrect(ctx, lx, ly, lw, lh, 5); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 9px system-ui,sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('예측 시작 →', lx + lw / 2, ly + lh / 2)
    ctx.restore()
  }, [pastData])

  // 피보나치 레이블 y좌표 재계산 → HTML 오버레이 업데이트
  const updateFibLabels = useCallback(() => {
    const series = candleRef.current
    if (!series || fibLevelsRef.current.length === 0) { setFibLabels([]); return }
    setFibLabels(
      fibLevelsRef.current
        .map(lv => ({ ...lv, y: series.priceToCoordinate(lv.value) ?? -999 }))
        .filter(lv => lv.y >= 2 && lv.y <= MAIN_H - 2)
    )
  }, [])

  const drawDot = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color = '#6c63ff') => {
    ctx.save()
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current, chart = chartRef.current, series = candleRef.current
    if (!canvas || !chart) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawCutoff(ctx, chart)
    // 피보나치 레이블은 HTML 오버레이로 표시 (canvas 그리기 불필요)

    const pending = pendingRef.current
    const mouse   = mouseRef.current
    const tool    = toolRef.current
    if (pending && series) {
      const x1 = chart.timeScale().timeToCoordinate(pending.time)
      const y1 = series.priceToCoordinate(pending.price)
      if (x1 !== null && y1 !== null) {
        if (mouse && (tool === 'trendline' || tool === 'fibonacci')) {
          ctx.save()
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = 'rgba(108,99,255,0.75)'
          ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.restore()
          ctx.save()
          ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(108,99,255,0.5)'; ctx.fill(); ctx.restore()
        }
        drawDot(ctx, x1, y1, tool === 'fibonacci' ? '#f97316' : '#6c63ff')
      }
    }
  }, [drawCutoff, drawDot])

  /* ══ 차트 생성 (1회) ════════════════════════════════════════ */
  useEffect(() => {
    if (!mainRef.current) return
    syncCanvas()
    const cc = getChartColors(isDark)
    const chart = createChart(mainRef.current, {
      layout: { background: { type: ColorType.Solid, color: cc.bg }, textColor: cc.text },
      grid:   { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: cc.border },
      timeScale: { borderColor: cc.border, timeVisible: true, fixLeftEdge: true, fixRightEdge: true },
      width: mainRef.current.clientWidth, height: MAIN_H,
    })
    const series = chart.addCandlestickSeries({
      upColor: cc.candleUp, downColor: cc.candleDown,
      borderUpColor: cc.candleUp, borderDownColor: cc.candleDown,
      wickUpColor: cc.candleUp, wickDownColor: cc.candleDown,
    })
    chartRef.current = chart; candleRef.current = series
    // TimeRange 기반 sync + 피보나치 HTML 레이블 y좌표 재계산
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      updateFibLabels()
      redrawCanvas()
      if (!range) return
      // 이미 생성된 서브차트에만 setVisibleRange (없으면 무시 — 각 서브차트 effect의 RAF가 초기 sync 담당)
      if (rsiChart.current)  { try { rsiChart.current.timeScale().setVisibleRange(range)  } catch {} }
      if (macdChart.current) { try { macdChart.current.timeScale().setVisibleRange(range) } catch {} }
    })
    chart.subscribeCrosshairMove((p: MouseEventParams<Time>) => {
      mouseRef.current = p.point ? { x: p.point.x, y: p.point.y } : null
      redrawCanvas()
    })
    const onResize = () => {
      if (!mainRef.current) return
      chart.applyOptions({ width: mainRef.current.clientWidth }); syncCanvas(); redrawCanvas()
      if (rsiDiv.current  && rsiChart.current)  rsiChart.current.applyOptions({ width: rsiDiv.current.clientWidth })
      if (macdDiv.current && macdChart.current) macdChart.current.applyOptions({ width: macdDiv.current.clientWidth })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove(); chartRef.current = null; candleRef.current = null
      bbRef.current = null; maRef.current = null
      rsiChart.current?.remove();  rsiChart.current  = null; rsiSeries.current  = null
      macdChart.current?.remove(); macdChart.current = null; macdSeries.current = null
    }
  }, [syncCanvas, redrawCanvas, updateFibLabels, isDark])  // eslint-disable-line react-hooks/exhaustive-deps

  /* ══ 테마 변경 → 차트 색상 업데이트 (applyOptions) ══════════ */
  useEffect(() => {
    const chart  = chartRef.current
    const candle = candleRef.current
    if (!chart || !candle) return
    const cc = getChartColors(isDark)
    chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: cc.bg }, textColor: cc.text },
      grid:   { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
      rightPriceScale: { borderColor: cc.border },
      timeScale:       { borderColor: cc.border },
    })
    candle.applyOptions({
      upColor: cc.candleUp, downColor: cc.candleDown,
      borderUpColor: cc.candleUp, borderDownColor: cc.candleDown,
      wickUpColor: cc.candleUp, wickDownColor: cc.candleDown,
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
    // RSI / MACD 서브차트는 isDark deps에 포함 → 자동 재생성
  }, [isDark])

  /* ══ 메인 캔들 + BB/MA ══════════════════════════════════════ */
  useEffect(() => {
    const chart = chartRef.current, candle = candleRef.current
    if (!chart || !candle || pastData.length === 0) return
    const data = revealed ? [...pastData, ...futureData] : pastData

    // 실제 캔들 데이터가 바뀔 때만 setData + fitContent 호출
    // (MA/BB toggle 시 activeInds만 변경 → candle.setData 생략해야 차트 유지됨)
    const isNewData = prevPastRef.current !== pastData || prevRevealedRef.current !== revealed
    if (isNewData) {
      prevPastRef.current     = pastData
      prevRevealedRef.current = revealed
      candle.setData(data as any)
      if (revealed) {
        candle.setMarkers([{
          time: futureData[0].time as Time,
          position: 'belowBar', color: '#fbbf24', shape: 'arrowUp', text: '공개 시점',
        }])
      }
      chart.timeScale().fitContent()
    }
    // BB
    if (activeInds.has('bollinger')) {
      const { upper, middle, lower } = calcBollingerBands(data)
      if (!bbRef.current) {
        const cc2 = getChartColors(isDark)
        const mk = (c: string, dash = false) => chart.addLineSeries({ color: c, lineWidth: 1, lineStyle: dash ? 2 : 0, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
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
    // MA
    if (activeInds.has('moving-average')) {
      const ma5   = calcMA(data,   5)
      const ma20  = calcMA(data,  20)
      const ma60  = calcMA(data,  60)
      const ma120 = calcMA(data, 120)
      if (!maRef.current) {
        const cc2 = getChartColors(isDark)
        const mkMA = (color: string) => chart.addLineSeries({ color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
        maRef.current = {
          ma5:   mkMA(cc2.ma5),
          ma20:  mkMA(cc2.ma20),
          ma60:  mkMA(cc2.ma60),
          ma120: mkMA(cc2.ma120),
        }
      }
      maRef.current.ma5.setData(ma5     as any)
      maRef.current.ma20.setData(ma20   as any)
      maRef.current.ma60.setData(ma60   as any)
      maRef.current.ma120.setData(ma120 as any)
    } else if (maRef.current) {
      chart.removeSeries(maRef.current.ma5)
      chart.removeSeries(maRef.current.ma20)
      chart.removeSeries(maRef.current.ma60)
      chart.removeSeries(maRef.current.ma120)
      maRef.current = null
    }
    redrawCanvas()
  }, [pastData, futureData, revealed, activeInds, redrawCanvas])

  /* ══ RSI 서브차트 ════════════════════════════════════════════ */
  useEffect(() => {
    const data = revealed ? [...pastData, ...futureData] : pastData

    // ① 반드시 cleanup 먼저 — rsiDiv.current 체크보다 앞에 와야 함
    //    RSI를 끄면 React가 rsiDiv DOM을 제거 → rsiDiv.current = null이 된 후 effect 실행
    //    이때 "if (!rsiDiv.current) return"이 먼저 오면 cleanup이 건너뛰어져
    //    rsiChart.current에 구(stale) 인스턴스가 남음 → 재활성화 시 아무것도 안 보이는 버그
    if (!activeInds.has('rsi')) {
      if (rsiChart.current) { try { rsiChart.current.remove() } catch {} }
      rsiChart.current = null; rsiSeries.current = null
      return
    }

    // ② RSI 활성 상태인데 div가 아직 DOM에 없으면 대기
    if (!rsiDiv.current) return

    if (!rsiChart.current) {
      const cc = getChartColors(isDark)
      rsiChart.current = createChart(rsiDiv.current, {
        layout: { background: { type: ColorType.Solid, color: cc.bg }, textColor: cc.text },
        grid:   { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: cc.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { visible: false },
        handleScroll: false, handleScale: false,
        width: rsiDiv.current.clientWidth, height: SUB_H,
      })
      rsiSeries.current = null
    }
    const rc = rsiChart.current
    const rsiData = calcRSI(data)
    if (!rsiSeries.current) {
      const cc = getChartColors(isDark)
      rsiSeries.current = {
        line: rc.addLineSeries({ color: cc.rsiLine, lineWidth: 2, lastValueVisible: true,  priceLineVisible: false }),
        ob:   rc.addLineSeries({ color: cc.rsi70,   lineWidth: 1, lineStyle: 2,            lastValueVisible: false, priceLineVisible: false }),
        os:   rc.addLineSeries({ color: cc.rsi30,   lineWidth: 1, lineStyle: 2,            lastValueVisible: false, priceLineVisible: false }),
      }
    }
    rsiSeries.current.line.setData(rsiData as any)
    if (rsiData.length > 0) {
      const [f, l] = [rsiData[0].time, rsiData[rsiData.length - 1].time]
      rsiSeries.current.ob.setData([{ time: f, value: 70 }, { time: l, value: 70 }] as any)
      rsiSeries.current.os.setData([{ time: f, value: 30 }, { time: l, value: 30 }] as any)
    }
    // ① 메인 차트 range를 동기적으로 캡처 (RAF 안에서 읽으면 타이밍에 따라 null 가능)
    const capturedRsiRange = chartRef.current?.timeScale().getVisibleRange() ?? null
    rc.timeScale().fitContent()
    requestAnimationFrame(() => {
      // ② 첫 마운트 시 rsiDiv.clientWidth 가 0일 수 있으므로 여기서 재보정
      if (rsiDiv.current) {
        const w = rsiDiv.current.clientWidth
        if (w > 0) rc.applyOptions({ width: w })
      }
      // ③ 줌/스크롤 상태 반영 — range 없으면 fitContent 이미 적용된 상태 유지
      if (capturedRsiRange) {
        try { rc.timeScale().setVisibleRange(capturedRsiRange) } catch {}
      }
    })
  }, [activeInds, revealed, pastData, futureData, isDark])

  /* ══ MACD 서브차트 ═══════════════════════════════════════════ */
  useEffect(() => {
    const data = revealed ? [...pastData, ...futureData] : pastData

    // ① cleanup 먼저 (RSI와 동일한 이유 — stale ref 방지)
    if (!activeInds.has('macd')) {
      if (macdChart.current) { try { macdChart.current.remove() } catch {} }
      macdChart.current = null; macdSeries.current = null
      return
    }

    // ② MACD 활성 상태인데 div가 아직 DOM에 없으면 대기
    if (!macdDiv.current) return

    if (!macdChart.current) {
      const cc = getChartColors(isDark)
      macdChart.current = createChart(macdDiv.current, {
        layout: { background: { type: ColorType.Solid, color: cc.bg }, textColor: cc.text },
        grid:   { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: cc.border, scaleMargins: { top: 0.15, bottom: 0.15 } },
        timeScale: { visible: false },
        handleScroll: false, handleScale: false,
        width: macdDiv.current.clientWidth, height: SUB_H,
      })
      macdSeries.current = null
    }
    const mc = macdChart.current
    const md = calcMACD(data)
    if (!macdSeries.current) {
      const cc = getChartColors(isDark)
      macdSeries.current = {
        hist:   mc.addHistogramSeries({ color: cc.histPos, lastValueVisible: false, priceLineVisible: false }),
        line:   mc.addLineSeries({ color: cc.macdLine,   lineWidth: 2, lastValueVisible: true,  priceLineVisible: false }),
        signal: mc.addLineSeries({ color: cc.signalLine, lineWidth: 1, lastValueVisible: true,  priceLineVisible: false }),
      }
    }
    const cc = getChartColors(isDark)
    macdSeries.current.hist.setData(md.filter(d => d.histogram !== null).map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? cc.histPos : cc.histNeg })) as any)
    macdSeries.current.line.setData(md.map(d => ({ time: d.time, value: d.macd })) as any)
    macdSeries.current.signal.setData(md.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal! })) as any)
    // ① 메인 차트 range를 동기적으로 캡처
    const capturedMacdRange = chartRef.current?.timeScale().getVisibleRange() ?? null
    mc.timeScale().fitContent()
    requestAnimationFrame(() => {
      // ② 첫 마운트 시 macdDiv.clientWidth 가 0일 수 있으므로 여기서 재보정
      if (macdDiv.current) {
        const w = macdDiv.current.clientWidth
        if (w > 0) mc.applyOptions({ width: w })
      }
      // ③ 줌/스크롤 상태 반영
      if (capturedMacdRange) {
        try { mc.timeScale().setVisibleRange(capturedMacdRange) } catch {}
      }
    })
  }, [activeInds, revealed, pastData, futureData, isDark])

  /* ══ 고무줄 프리뷰 ═══════════════════════════════════════════ */
  useEffect(() => {
    const chart = chartRef.current, series = candleRef.current
    if (!chart || !series) return
    if (drawTool !== 'trendline' && drawTool !== 'fibonacci') { redrawCanvas(); return }
    const onMove = (p: MouseEventParams<Time>) => {
      mouseRef.current = p.point ? { x: p.point.x, y: p.point.y } : null
      redrawCanvas()
    }
    chart.subscribeCrosshairMove(onMove)
    return () => { chart.unsubscribeCrosshairMove(onMove); redrawCanvas() }
  }, [drawTool, redrawCanvas])

  /* ══ 클릭 핸들러 ═════════════════════════════════════════════ */
  const handleClick = useCallback((p: MouseEventParams<Time>) => {
    const tool = toolRef.current, chart = chartRef.current, series = candleRef.current
    if (!chart || !series || !p.point || !p.time) return
    const price = series.coordinateToPrice(p.point.y)
    if (price === null) return
    const time = p.time
    const dotOnCanvas = (color: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const px = chart.timeScale().timeToCoordinate(time)
      const py = series.priceToCoordinate(price)
      if (ctx && px !== null && py !== null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawCutoff(ctx, chart)
        drawDot(ctx, px, py, color)
      }
    }
    if (tool === 'trendline') {
      if (!pendingRef.current) {
        pendingRef.current = { time, price }; setDrawStep(1); dotOnCanvas('#6c63ff')
      } else {
        const start = pendingRef.current; pendingRef.current = null
        const s = chart.addLineSeries({ color: '#6c63ff', lineWidth: 2, lastValueVisible: false, priceLineVisible: false })
        const pts = String(start.time) < String(time)
          ? [{ time: start.time, value: start.price }, { time, value: price }]
          : [{ time, value: price }, { time: start.time, value: start.price }]
        s.setData(pts as any); drawnRef.current.push(s)
        redrawCanvas(); setDrawStep(0); setTool('none')
      }
    }
    if (tool === 'fibonacci') {
      if (!pendingRef.current) {
        pendingRef.current = { time, price }; setDrawStep(1); dotOnCanvas('#f97316')
      } else {
        const start = pendingRef.current; pendingRef.current = null
        const hi = Math.max(start.price, price), lo = Math.min(start.price, price), range = hi - lo
        const t0 = pastData[0].time as Time
        const allD = revealed ? [...pastData, ...futureData] : pastData
        const t1 = allD[allD.length - 1].time as Time
        FIB_LEVELS.forEach(({ ratio, color, label }) => {
          const value = hi - range * ratio
          // title/lastValueVisible 제거 → 오른쪽 레이블 없음, 캔버스에서 왼쪽에 그림
          const s = chart.addLineSeries({ color, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          s.setData([{ time: t0, value }, { time: t1, value }] as any)
          drawnRef.current.push(s)
          fibLevelsRef.current.push({ value, label, color })
        })
        redrawCanvas()
        requestAnimationFrame(updateFibLabels)  // 차트 좌표계 정착 후 y좌표 계산
        setDrawStep(0); setTool('none')
      }
    }
  }, [drawCutoff, drawDot, redrawCanvas, setTool, updateFibLabels, pastData, futureData, revealed])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (drawTool === 'erase') {
      drawnRef.current.forEach(s => { try { chart.removeSeries(s) } catch {} })
      drawnRef.current = []; pendingRef.current = null
      fibLevelsRef.current = []
      setFibLabels([])   // HTML 레이블 제거
      redrawCanvas(); setDrawStep(0); setTool('none'); return
    }
    if (drawTool === 'none') return
    chart.subscribeClick(handleClick)
    return () => chart.unsubscribeClick(handleClick)
  }, [drawTool, handleClick, setTool, redrawCanvas])

  /* ══ 예측 확정 → 결과 공개 ═══════════════════════════════════ */
  const handleConfirmPrediction = useCallback((choice: Choice) => {
    if (futureData.length === 0) return
    // 예측 시점 지표 분석 — 항상 전체 4개 지표 분석
    const signals = analyzeSignals(pastData)
    setPrediction(choice)
    setDebriefSignals(signals)
    revRef.current = true
    setRevealed(true)
    setPhase('revealed')
    const startPrice = futureData[0].open
    const endPrice   = futureData[futureData.length - 1].close
    const change     = ((endPrice - startPrice) / startPrice) * 100
    const resultData = { change, startPrice, endPrice, days: futureData.length }
    setResult(resultData)
    markSim()

    // 결과 정답 여부 계산
    const isRight = (change >= 5 && choice === 'up') || (change <= -5 && choice === 'down') || (change > -5 && change < 5 && choice === 'sideways')
    const actualChange = Math.round(change * 10) / 10

    // 예측 제출 이벤트
    trackEvent('challenge_prediction_submitted', {
      prediction:               choice,
      active_indicators_count:  activeInds.size,
    })

    // 결과 공개 이벤트
    trackEvent('challenge_completed', {
      prediction:               choice,
      is_correct:               isRight,
      actual_change:            actualChange,
      active_indicators_count:  activeInds.size,
      future_days:              futureData.length,
    })
    trackEvent('simulation_completed', {
      prediction:               choice,
      is_correct:               isRight,
      actual_change:            actualChange,
      device_type:              getDeviceType(),
    })
  }, [futureData, pastData, activeInds, markSim])

  /* ── 날짜 포맷 ─────────────────────────────────────────────── */
  const fmtDate = (d: CandleData) => d.time.slice(0, 7).replace('-', '년 ') + '월'
  const periodLabel = pastData.length > 0 && futureData.length > 0
    ? `${fmtDate(pastData[0])} ~ ${fmtDate(pastData[pastData.length - 1])}`
    : ''
  const futurePeriodLabel = futureData.length > 0
    ? `${fmtDate(futureData[0])} ~ ${fmtDate(futureData[futureData.length - 1])}`
    : ''

  const showRSI  = activeInds.has('rsi')
  const showMACD = activeInds.has('macd')
  const cursor   = (drawTool === 'trendline' || drawTool === 'fibonacci') ? 'crosshair' : 'default'

  /* ══ 렌더 ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-3">

      {/* ── 기간 배지 ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-navi-surface border border-navi-border rounded-lg px-2.5 py-1 text-navi-muted">
          분석 구간: <span className="text-navi-text font-medium">{periodLabel}</span>
        </span>
        {phase !== 'revealed'
          ? <span className="bg-amber-500/[0.08] border border-amber-500/28 rounded-lg px-2.5 py-1 text-navi-text animate-pulse">
              앞으로 {futureData.length}일 숨김
            </span>
          : <span className="bg-amber-500/[0.08] border border-amber-500/28 rounded-lg px-2.5 py-1 text-navi-text">
              공개 구간: {futurePeriodLabel}
            </span>
        }
      </div>

      {/* ── 메인 차트 + 캔버스 ────────────────────────────────── */}
      <div id="challenge-chart" className="bg-navi-surface border border-navi-border rounded-xl p-3">
        <div className="relative" style={{ cursor }}>
          <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />
          <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" style={{ height: MAIN_H, borderRadius: '0.75rem' }} />
          {/* MA 범례 오버레이 */}
          {activeInds.has('moving-average') && (() => {
            const cc2 = getChartColors(isDark)
            const legend = [
              { color: cc2.ma5,   label: 'MA5'   },
              { color: cc2.ma20,  label: 'MA20'  },
              { color: cc2.ma60,  label: 'MA60'  },
              { color: cc2.ma120, label: 'MA120' },
            ]
            return (
              <div className="absolute top-2 left-2 flex flex-col gap-0.5 pointer-events-none z-10">
                {legend.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* 피보나치 레이블 HTML 오버레이 */}
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
        </div>

        {showRSI && (
          <div className="mt-1">
            <div className="flex items-center gap-3 mb-1 px-1">
              <span className="text-[11px] font-semibold text-navi-secondary">RSI (14)</span>
              <span className="text-[11px] text-navi-muted">── 70</span>
              <span className="text-[11px] text-navi-muted">── 30</span>
            </div>
            <div ref={rsiDiv} className="w-full rounded-xl overflow-hidden" />
          </div>
        )}
        {showMACD && (
          <div className="mt-1">
            <div className="flex items-center gap-3 mb-1 px-1">
              <span className="text-[11px] font-semibold text-navi-secondary">MACD (12,26,9)</span>
              <span className="text-[11px] text-navi-muted">── 시그널</span>
            </div>
            <div ref={macdDiv} className="w-full rounded-xl overflow-hidden" />
          </div>
        )}

        {(drawTool === 'trendline' || drawTool === 'fibonacci') && (
          <div className={clsx(
            'mt-2 rounded-xl overflow-hidden border transition-all duration-300',
            drawStep === 0
              ? 'border-amber-500/28 bg-amber-500/[0.06]'
              : 'border-amber-500/50 bg-amber-500/[0.12] shadow-[0_2px_12px_rgba(245,158,11,0.15)]'
          )}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              {/* 스텝 인디케이터 */}
              <div className="flex items-center gap-1 shrink-0">
                <span className={clsx(
                  'text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center transition-all',
                  drawStep === 0
                    ? 'bg-amber-400/20 text-amber-400/70'
                    : 'bg-amber-400/30 text-amber-300/50'
                )}>①</span>
                <div className={clsx('w-3 h-px', drawStep === 1 ? 'bg-amber-400/50' : 'bg-navi-border')} />
                <span className={clsx(
                  'text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center transition-all',
                  drawStep === 1
                    ? 'bg-amber-400/30 text-amber-300 animate-pulse ring-1 ring-amber-400/40'
                    : 'bg-navi-border/50 text-navi-muted'
                )}>②</span>
              </div>

              <p className={clsx(
                'flex-1 font-semibold transition-colors',
                drawStep === 0 ? 'text-[12px] text-navi-text' : 'text-[12px] text-amber-200'
              )}>
                {drawStep === 0
                  ? (drawTool === 'trendline' ? '시작점을 탭하세요' : '고점(또는 저점)을 탭하세요')
                  : (drawTool === 'trendline' ? '✓ 완료! 이제 끝점을 탭하세요' : '✓ 완료! 이제 반대 끝점을 탭하세요')
                }
              </p>

              <button
                onClick={() => { pendingRef.current = null; setDrawStep(0); setTool('none'); redrawCanvas() }}
                className="text-[11px] text-navi-muted hover:text-navi-text shrink-0 transition-colors px-1.5"
              >취소</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 도구 패널 — 모바일: 가로 스크롤 / PC: 2열 그리드 ── */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        {/* 분석 도구 (PC) */}
        <div id="challenge-analysis-panel" className="bg-navi-surface border border-navi-border rounded-xl p-3 overflow-visible">
          <p className="text-[11px] font-bold text-navi-secondary mb-2">분석 도구</p>
          <div className="flex flex-wrap gap-1.5">
            {INDICATOR_BTNS.map(({ key, label }) => (
              <button key={key} onClick={() => toggleInd(key)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  activeInds.has(key)
                    ? 'bg-navi-action text-white'
                    : 'bg-navi-surface2 text-navi-text border border-navi-border hover:border-navi-action/40'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* 작도 도구 (PC) */}
        <div id="challenge-drawing-panel" className="bg-navi-surface border border-navi-border rounded-xl p-3">
          <p className="text-[11px] font-bold text-navi-secondary mb-2">작도 도구</p>
          <div className="flex flex-wrap gap-1.5">
            {([
              { v: 'trendline', icon: '↗', label: '추세선'  },
              { v: 'fibonacci', icon: '𝚽', label: '피보나치' },
            ] as const).map(({ v, icon, label }) => (
              <button key={v} onClick={() => setTool(drawTool === v ? 'none' : v)}
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                  drawTool === v
                    ? 'bg-amber-500/12 border-amber-500/40 text-navi-text'
                    : 'border-navi-border text-navi-text hover:border-navi-border2'
                )}>
                <span>{icon}</span>{label}
                {drawTool === v && <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />}
              </button>
            ))}
            <button onClick={() => setTool('erase')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-navi-border text-navi-secondary hover:border-navi-border2 hover:text-navi-text transition-all">
              ✕ 지우기
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 전용 도구 패널 — 2×2 분석 + 1행 작도 (가로 스크롤 없음) */}
      <div className="sm:hidden space-y-2">
        {/* 분석 도구: 2×2 그리드 */}
        <div id="challenge-analysis-panel"
             className="bg-navi-surface border border-navi-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-navi-muted uppercase tracking-widest mb-2">분석 도구</p>
          <div className="grid grid-cols-2 gap-2">
            {INDICATOR_BTNS.map(({ key, label }) => (
              <button key={key} onClick={() => toggleInd(key)}
                className={clsx(
                  'h-10 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.96]',
                  activeInds.has(key)
                    ? 'bg-navi-action text-white shadow-[0_0_10px_rgba(91,127,255,0.3)]'
                    : 'bg-navi-surface2 text-navi-text border border-navi-border'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 작도 도구: 1행 3버튼 */}
        <div id="challenge-drawing-panel"
             className="bg-navi-surface border border-navi-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-navi-muted uppercase tracking-widest mb-2">작도 도구</p>
          <div className="flex gap-2">
            {([
              { v: 'trendline' as const, label: '추세선'   },
              { v: 'fibonacci' as const, label: '피보나치' },
            ]).map(({ v, label }) => (
              <button key={v} onClick={() => setTool(drawTool === v ? 'none' : v)}
                className={clsx(
                  'flex-1 h-10 rounded-xl text-[12px] font-semibold border transition-all active:scale-[0.96]',
                  drawTool === v
                    ? 'bg-amber-500/12 border-amber-500/40 text-navi-text'
                    : 'border-navi-border text-navi-text'
                )}>
                {label}
                {drawTool === v && <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-amber-400/70 animate-pulse align-middle" />}
              </button>
            ))}
            <button onClick={() => setTool('erase')}
              className="h-10 px-4 rounded-xl text-[12px] border border-navi-border text-navi-secondary transition-all active:scale-[0.96]">
              지우기
            </button>
          </div>
        </div>
      </div>

      {/* ══ 하단 영역: phase별 렌더 ══════════════════════════════ */}

      {/* ── PHASE 1: 분석 중 ────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div className="space-y-2">
          {activeInds.size === 0 && (
            <div className="px-4 py-3 rounded-xl bg-navi-surface border border-navi-border2 text-[12px] text-navi-secondary">
              분석 도구를 하나 이상 켜보세요 — MA, RSI, MACD 중 하나를 활성화하면 더 근거 있는 예측을 할 수 있어요.
            </div>
          )}
          <button
            id="challenge-predict-btn"
            onClick={() => {
              trackEvent('challenge_started', { active_indicators_count: activeInds.size })
              setPhase('predicting')
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-[13px]
                       bg-navi-action text-white
                       hover:bg-navi-action-hover
                       transition-all active:scale-[0.98]"
          >
            분석 완료 — 이제 예측해볼게요
          </button>
        </div>
      )}

      {/* ── PHASE 2: 예측 선택 ─────────────────────────────────── */}
      {phase === 'predicting' && (
        <div className="bg-navi-surface border border-navi-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-[14px] font-bold text-navi-text mb-1">
              이 시점 이후 {futureData.length}일, 주가는?
            </p>
            <p className="text-[12px] text-navi-muted">지금까지 분석한 내용을 바탕으로 예측해봐요. 틀려도 괜찮아요!</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { choice: 'up'       as Choice, icon: '↑', label: '상승', desc: '+5% 초과' },
              { choice: 'sideways' as Choice, icon: '→', label: '횡보', desc: '±5% 이내' },
              { choice: 'down'     as Choice, icon: '↓', label: '하락', desc: '-5% 초과' },
            ]).map(({ choice, icon, label, desc }) => (
              <button
                key={choice}
                onClick={() => handleConfirmPrediction(choice)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all active:scale-95',
                  'border-navi-border2 text-navi-muted',
                  'hover:border-navi-action/50 hover:bg-navi-action/[0.06] hover:text-navi-text'
                )}
              >
                <span className="text-[22px] font-bold leading-none text-navi-text">{icon}</span>
                <span className="text-[13px] font-bold text-navi-text">{label}</span>
                <span className="text-[10px] text-navi-muted">{desc}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setPhase('analyzing')}
            className="w-full text-xs text-navi-muted hover:text-navi-text transition-colors"
          >
            ← 다시 분석하기
          </button>
        </div>
      )}

      {/* ── PHASE 3: 결과 + 디브리핑 ──────────────────────────── */}
      {phase === 'revealed' && result && prediction && (
        <div className="space-y-3">

          {/* 결과 카드 */}
          <div className={clsx(
            'rounded-xl border p-4',
            result.change >= 0 ? 'bg-navi-surface border border-navi-border2' : 'bg-navi-surface border border-navi-border2'
          )}>
            <p className="text-xs text-navi-muted mb-2">{futurePeriodLabel} · 실제 결과 ({result.days}거래일)</p>
            <div className="flex items-start gap-4">
              {/* 실제 변동 — surface/border로 상태 표현 */}
              <div className={clsx(
                'flex-1 px-3 py-2.5 rounded-xl border',
                result.change >= 0
                  ? 'bg-navi-success/[0.08] border-navi-success/25'
                  : 'bg-navi-danger/[0.08] border-navi-danger/25'
              )}>
                <p className="text-[28px] font-black text-navi-text leading-none">
                  {result.change >= 0 ? '+' : ''}{result.change.toFixed(1)}%
                </p>
                <p className="text-[11px] text-navi-muted mt-1">
                  ${result.startPrice.toFixed(2)} → ${result.endPrice.toFixed(2)}
                </p>
              </div>

              {/* 예측 적중 여부 */}
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-navi-text">
                  {isCorrect(prediction, result.change) ? '예측 성공' : '이번엔 달랐어요'}
                </p>
                <p className="text-[11px] text-navi-muted mt-0.5">
                  내 예측: {prediction === 'up' ? '↑ 상승' : prediction === 'down' ? '↓ 하락' : '→ 횡보'}
                </p>
              </div>
            </div>
          </div>

          {/* 디브리핑 카드 */}
          <div className="bg-navi-surface border border-navi-border rounded-xl p-4">
            <p className="text-[11px] font-bold text-navi-secondary mb-3 uppercase tracking-[0.07em]">
              예측 시점, 지표들은 이렇게 말하고 있었어요
            </p>

            {debriefSignals.length > 0 && (
              <div className="space-y-2.5">
                {debriefSignals.map((sig, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {/* 신호 배지 = surface + border (텍스트 색 아닌 배경으로 상태 표현) */}
                    <span className={clsx(
                      'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5',
                      sig.type === 'bullish' ? 'bg-navi-success/[0.10] border border-navi-success/25 text-navi-text' :
                      sig.type === 'bearish' ? 'bg-navi-danger/[0.10] border border-navi-danger/25 text-navi-text' :
                      'bg-navi-surface2 border border-navi-border2 text-navi-secondary'
                    )}>
                      {sig.name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-navi-text leading-snug">{sig.label}</p>
                      <p className="text-[11px] text-navi-muted leading-relaxed">{sig.detail}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-2 pt-2 border-t border-navi-border">
                  <p className="text-[12px] text-navi-secondary leading-relaxed">
                    지표는 힌트일 뿐이에요. 여러 신호가 같은 방향을 가리킬수록 신뢰도가 올라가요.
                    틀렸다면 어느 신호를 놓쳤는지 확인해봐요!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => { revRef.current = false; onRetry() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-navi-action text-white hover:bg-navi-action-hover transition-colors"
            >
              다른 구간 도전
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
