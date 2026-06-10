'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type Time } from 'lightweight-charts'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { IndicatorSlug, CandleData } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { getChartColors } from '@/lib/chartColors'


type TLResult = {
  segment:   CandleData[]
  startIdx:  number    // 첫 번째 앵커 저점의 segment 인덱스
  slope:     number    // 봉당 가격 변화 (양수 = 상승 추세선)
  baseValue: number    // startIdx 시점의 추세선 값
  touches:   number[]  // 터치 봉 인덱스 배열
}

function buildFixedTrendline(data: CandleData[]): TLResult | null {
  const seg = data.filter(d => d.time >= '2022-10-01' && d.time <= '2024-12-31')
  if (seg.length < 10) return null

  const w1 = seg.filter(d => d.time >= '2023-01-20' && d.time <= '2023-02-10')
  const w2 = seg.filter(d => d.time >= '2024-04-15' && d.time <= '2024-05-10')
  if (!w1.length || !w2.length) return null

  const p1 = w1.reduce((m, d) => d.low < m.low ? d : m, w1[0])
  const p2 = w2.reduce((m, d) => d.low < m.low ? d : m, w2[0])
  const i1 = seg.findIndex(d => d.time === p1.time)
  const i2 = seg.findIndex(d => d.time === p2.time)
  if (i1 < 0 || i2 < 0 || i2 <= i1) return null

  const slope = (p2.low - p1.low) / (i2 - i1)

  const supportWindows = [
    ['2023-03-01', '2023-03-31'],
    ['2023-09-01', '2023-09-30'],
    ['2024-04-15', '2024-05-10'],
  ]
  const touches: number[] = []
  for (const [from, to] of supportWindows) {
    const win = seg.filter(d => d.time >= from && d.time <= to)
    if (!win.length) continue
    const low = win.reduce((m, d) => d.low < m.low ? d : m, win[0])
    const idx = seg.findIndex(d => d.time === low.time)
    if (idx >= 0) touches.push(idx)
  }

  return { segment: seg, startIdx: i1, slope, baseValue: p1.low, touches }
}

type FibResult = {
  segment:    CandleData[]
  rallyLow:   number
  rallyHigh:  number
  closestFib: number   // 되돌림이 멈춘 피보나치 레벨 (0.382 / 0.5 / 0.618 등)
  bounceIdx:  number   // 되돌림 저점 인덱스 (segment 기준)
}

function buildFixedFibonacci(data: CandleData[]): FibResult | null {
  const seg = data.filter(d => d.time >= '2022-12-01' && d.time <= '2023-05-31')
  if (seg.length < 10) return null

  const lowWindow  = seg.filter(d => d.time >= '2023-01-01' && d.time <= '2023-01-25')
  const highWindow = seg.filter(d => d.time >= '2023-01-20' && d.time <= '2023-02-15')
  if (!lowWindow.length || !highWindow.length) return null

  const lowCandle  = lowWindow.reduce( (m, d) => d.low  < m.low  ? d : m, lowWindow[0])
  const highCandle = highWindow.reduce((m, d) => d.high > m.high ? d : m, highWindow[0])
  const highIdx = seg.findIndex(d => d.time === highCandle.time)
  let bounceIdx = Math.min(highIdx + 1, seg.length - 1)
  for (let k = highIdx + 2; k < Math.min(seg.length, highIdx + 30); k++) {
    if (seg[k].low < seg[bounceIdx].low) bounceIdx = k
  }

  const rallyLow   = lowCandle.low
  const rallyHigh  = highCandle.high
  const range      = rallyHigh - rallyLow
  const bounceVal  = seg[bounceIdx].low
  const retracePct = (rallyHigh - bounceVal) / range
  const fibLevels  = [0.236, 0.382, 0.5, 0.618, 0.786]
  const closestFib = fibLevels.reduce((b, l) =>
    Math.abs(l - retracePct) < Math.abs(b - retracePct) ? l : b, 0.5)

  return { segment: seg, rallyLow, rallyHigh, closestFib, bounceIdx }
}

// ═══════════════════════════════════════════════════════════════════════════

const FIB_LEVELS = [
  { ratio: 0,     label: '0%',    color: '#94a3b8' },
  { ratio: 0.236, label: '23.6%', color: '#60a5fa' },
  { ratio: 0.382, label: '38.2%', color: '#34d399' },
  { ratio: 0.5,   label: '50%',   color: '#fbbf24' },
  { ratio: 0.618, label: '61.8%', color: '#f97316' },
  { ratio: 1,     label: '100%',  color: '#94a3b8' },
]

function makeChart(el: HTMLDivElement, height: number, isDark: boolean): IChartApi {
  const cc = getChartColors(isDark)
  return createChart(el, {
    layout: { background: { type: ColorType.Solid, color: cc.bg }, textColor: cc.text },
    grid:   { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
    crosshair:       { mode: CrosshairMode.Magnet },
    rightPriceScale: { borderColor: cc.border, scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale:       { borderColor: cc.border, timeVisible: false, rightOffset: 3 },
    handleScroll: false,
    handleScale:  false,
    width:  el.clientWidth,
    height,
  })
}

interface Props { slug: IndicatorSlug }

export function MiniChartPreview({ slug }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const subRef  = useRef<HTMLDivElement>(null)
  const [data,      setData]      = useState<CandleData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const { isDark } = useTheme()
  // 피보나치 HTML 레이블 (canvas 대신 React state로 관리)
  const [fibLabels, setFibLabels] = useState<{ value: number; label: string; color: string; y: number }[]>([])
  const needsSub = slug === 'rsi' || slug === 'macd'

  // ── 데이터 fetch (모든 지표 공통: 실제 MSFT 1Y 데이터) ────────────────────
  useEffect(() => {
    setLoading(true)
    setError(false)
    const period = (slug === 'trendline' || slug === 'fibonacci') ? 'ALL' : '1Y'
    fetch(`/api/candles?symbol=MSFT&period=${period}&timeUnit=daily`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d  => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [slug])

  // ── 차트 렌더 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mainRef.current || data.length === 0) return

    // ── 표시 구간 결정 ────────────────────────────────────────
    let preview:   CandleData[]
    let tlResult:  TLResult  | null = null
    let fibResult: FibResult | null = null

    if (slug === 'trendline') {
      tlResult = buildFixedTrendline(data)
      preview  = tlResult?.segment ?? data.slice(-65)
    } else if (slug === 'fibonacci') {
      fibResult = buildFixedFibonacci(data)
      preview   = fibResult?.segment ?? data.slice(-60)
    } else if (slug === 'moving-average') {
      preview = data.slice(-200)
    } else {
      preview = data.slice(-90)
    }

    const cc = getChartColors(isDark)
    const mainHeight = needsSub ? 240 : 320
    const mainChart  = makeChart(mainRef.current, mainHeight, isDark)
    const candleSeries = mainChart.addCandlestickSeries({
      upColor: cc.candleUp, downColor: cc.candleDown,
      borderUpColor: cc.candleUp, borderDownColor: cc.candleDown,
      wickUpColor:   cc.candleUp, wickDownColor:   cc.candleDown,
    })
    candleSeries.setData(preview as any)

    // ── 볼린저 밴드 ──────────────────────────────────────────
    if (slug === 'bollinger') {
      const { upper, middle, lower } = calcBollingerBands(preview)
      ;[
        { d: upper,  color: cc.bbBand, dash: false },
        { d: middle, color: cc.bbMid,  dash: true  },
        { d: lower,  color: cc.bbBand, dash: false },
      ].forEach(({ d, color, dash }) =>
        mainChart.addLineSeries({
          color, lineWidth: 1, lineStyle: dash ? 2 : 0,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )
    }

    // ── 이동평균선 ────────────────────────────────────────────
    if (slug === 'moving-average') {
      ;[
        { d: calcMA(preview, 5),   color: cc.ma5   },
        { d: calcMA(preview, 20),  color: cc.ma20  },
        { d: calcMA(preview, 60),  color: cc.ma60  },
        { d: calcMA(preview, 120), color: cc.ma120 },
      ].forEach(({ d, color }) =>
        mainChart.addLineSeries({
          color, lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )
    }

    // ── 추세선: 자동 탐색된 최적 상승 지지선 ─────────────────
    if (slug === 'trendline') {
      if (tlResult) {
        const { startIdx, slope, baseValue, touches } = tlResult
        const seg = preview
        const last = seg.length - 1

        // 첫 번째 앵커에서 차트 우측 끝까지 추세선 연장 (교육적: 앞으로의 지지 구간 시각화)
        mainChart.addLineSeries({
          color: '#818cf8', lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false,
        }).setData([
          { time: seg[startIdx].time as Time, value: baseValue },
          { time: seg[last].time     as Time, value: baseValue + slope * (last - startIdx) },
        ] as any)

        candleSeries.setMarkers(
          touches.map(b => ({
            time: seg[b].time, position: 'belowBar',
            color: '#818cf8', shape: 'circle', size: 1,
            text: '지지',
          })) as any
        )
      } else {
        // 폴백: 전반부/후반부 대표 저점 연결
        const h  = Math.floor(preview.length / 2)
        const p1 = preview.slice(0, h).reduce((m, d) => d.low < m.low ? d : m, preview[0])
        const p2 = preview.slice(h).reduce((m, d)   => d.low < m.low ? d : m, preview[h])
        mainChart.addLineSeries({
          color: '#818cf8', lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false,
        }).setData([
          { time: p1.time, value: p1.low },
          { time: p2.time, value: p2.low },
        ] as any)
        candleSeries.setMarkers([
          { time: p1.time, position: 'belowBar', color: '#818cf8', shape: 'circle', text: '①' },
          { time: p2.time, position: 'belowBar', color: '#818cf8', shape: 'circle', text: '②' },
        ] as any)
      }
    }

    // ── 피보나치: 자동 탐색된 상승→되돌림→반등 구간 ─────────
    if (slug === 'fibonacci') {
      const seg   = preview
      const BASE  = fibResult?.rallyLow  ?? Math.min(...seg.map(d => d.low))
      const PEAK  = fibResult?.rallyHigh ?? Math.max(...seg.map(d => d.high))
      const RANGE = PEAK - BASE
      const t0 = seg[0].time             as Time
      const t1 = seg[seg.length - 1].time as Time

      // 피보나치 레벨 데이터 수집
      const fibLevelData: { value: number; label: string; color: string }[] = []
      FIB_LEVELS.forEach(({ ratio, label, color }) => {
        const value   = PEAK - RANGE * ratio
        const isBest  = fibResult
          ? Math.abs(ratio - fibResult.closestFib) < 0.001
          : ratio === 0.618
        const displayLabel = isBest ? `${label} ★` : label
        mainChart.addLineSeries({
          color,
          lineWidth:        isBest ? 2 : 1,
          lineStyle:        2,
          lastValueVisible: false,
          priceLineVisible: false,
        }).setData([{ time: t0, value }, { time: t1, value }] as any)
        fibLevelData.push({ value, label: displayLabel, color })
      })

      // y좌표 계산 → HTML 레이블 state 업데이트
      const computeFibLabels = () => {
        setFibLabels(
          fibLevelData
            .map(lv => ({ ...lv, y: candleSeries.priceToCoordinate(lv.value) ?? -999 }))
            .filter(lv => lv.y >= 2 && lv.y <= mainHeight - 2)
        )
      }

      // time range 변화(fitContent, 스크롤) 시 y좌표 재계산
      mainChart.timeScale().subscribeVisibleTimeRangeChange(computeFibLabels)
      // RAF fallback: fitContent가 동기적으로 time range를 발화하지 않을 경우 대비
      requestAnimationFrame(computeFibLabels)

      // 되돌림 저점에 반등 화살표
      const bounceIdx = fibResult?.bounceIdx
        ?? (seg.findIndex(d => d.low === BASE) + 3)
      if (bounceIdx > 0 && bounceIdx < seg.length) {
        const fibLabel = fibResult
          ? `${Math.round(fibResult.closestFib * 1000) / 10}% 지지 반등`
          : '피보나치 지지 반등'
        candleSeries.setMarkers([{
          time: seg[bounceIdx].time, position: 'belowBar',
          color: '#f97316', shape: 'arrowUp', text: fibLabel,
        }] as any)
      }
    }

    // ── 시간축 범위 ───────────────────────────────────────────
    if (slug === 'moving-average') {
      // 200일 계산, 최근 60일만 화면에 표시
      const from = preview[Math.max(0, preview.length - 60)].time as Time
      const to   = preview[preview.length - 1].time              as Time
      mainChart.timeScale().setVisibleRange({ from, to })
    } else {
      mainChart.timeScale().fitContent()
    }

    // ── RSI 서브 차트 ─────────────────────────────────────────
    let subChart: IChartApi | null = null
    if (slug === 'rsi' && subRef.current) {
      subChart = makeChart(subRef.current, 130, isDark)
      const rsiData = calcRSI(preview)
      subChart.addLineSeries({ color: cc.rsiLine, lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(rsiData as any)
      if (rsiData.length > 0) {
        const [t0, t1] = [rsiData[0].time, rsiData[rsiData.length - 1].time]
        subChart.addLineSeries({ color: cc.rsi70, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 70 }, { time: t1, value: 70 }] as any)
        subChart.addLineSeries({ color: cc.rsi30, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 30 }, { time: t1, value: 30 }] as any)
      }
      subChart.timeScale().fitContent()
    }

    // ── MACD 서브 차트 ────────────────────────────────────────
    if (slug === 'macd' && subRef.current) {
      subChart = makeChart(subRef.current, 130, isDark)
      const md = calcMACD(preview)
      subChart.addHistogramSeries({ color: cc.histPos, lastValueVisible: false, priceLineVisible: false })
        .setData(md.filter(d => d.histogram !== null)
          .map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? cc.histPos : cc.histNeg })) as any)
      subChart.addLineSeries({ color: cc.macdLine,   lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(md.map(d => ({ time: d.time, value: d.macd })) as any)
      subChart.addLineSeries({ color: cc.signalLine, lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
        .setData(md.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal! })) as any)
      subChart.timeScale().fitContent()
    }

    const onResize = () => {
      if (mainRef.current)            mainChart.applyOptions({ width: mainRef.current.clientWidth })
      if (subChart && subRef.current) subChart.applyOptions({ width: subRef.current.clientWidth })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      mainChart.remove()
      subChart?.remove()
      setFibLabels([])  // slug 변경 시 이전 레이블 초기화
    }
  }, [data, slug, needsSub, isDark])

  // ── 범례 ─────────────────────────────────────────────────────────────────
  const ccL = getChartColors(isDark)
  const legends: { color: string; label: string }[] = []
  if (slug === 'bollinger')
    legends.push({ color: ccL.bbBand, label: '밴드' }, { color: ccL.bbMid, label: '중심(MA20)' })
  if (slug === 'moving-average')
    legends.push(
      { color: ccL.ma5, label: 'MA 5' }, { color: ccL.ma20, label: 'MA 20' },
      { color: '#a78bfa', label: 'MA 60' }, { color: '#f43f5e', label: 'MA 120' },
    )
  if (slug === 'rsi')
    legends.push({ color: ccL.rsiLine, label: 'RSI(14)' }, { color: ccL.rsi70, label: '70' }, { color: ccL.rsi30, label: '30' })
  if (slug === 'macd')
    legends.push({ color: ccL.macdLine, label: 'MACD' }, { color: ccL.signalLine, label: '시그널' })
  if (slug === 'trendline')
    legends.push({ color: '#818cf8', label: '상승 추세선' })
  if (slug === 'fibonacci')
    legends.push(
      { color: '#f97316', label: '61.8%' }, { color: '#fbbf24', label: '50%' },
      { color: '#34d399', label: '38.2%' }, { color: '#60a5fa', label: '23.6%' },
    )

  if (loading) return (
    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-navi-bg">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-navi-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-navi-muted">차트 준비 중...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-navi-bg">
      <p className="text-xs text-navi-muted">차트를 불러오지 못했어요</p>
    </div>
  )

  return (
    <div className="w-full space-y-1">
      {legends.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-2">
          {legends.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-navi-muted">{l.label}</span>
            </div>
          ))}
        </div>
      )}
      {/* 피보나치 레이블 HTML 오버레이 */}
      <div className="relative w-full">
        <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />
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
      {needsSub && <div ref={subRef} className="w-full rounded-xl overflow-hidden mt-0.5" />}
      <p className="text-right text-xs text-navi-border mt-1">
        MSFT · 실제 시장 데이터
      </p>
    </div>
  )
}
