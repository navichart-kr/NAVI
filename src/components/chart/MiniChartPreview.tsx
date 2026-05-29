'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type Time } from 'lightweight-charts'
import { calcBollingerBands, calcMA, calcRSI, calcMACD } from '@/lib/indicators'
import type { IndicatorSlug, CandleData } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════
//  교육용 최적 구간 자동 탐색 — 실제 NVDA 데이터에서 패턴이 가장 명확한 구간 선택
// ═══════════════════════════════════════════════════════════════════════════

type TLResult = {
  segment:   CandleData[]
  startIdx:  number    // 첫 번째 앵커 저점의 segment 인덱스
  slope:     number    // 봉당 가격 변화 (양수 = 상승 추세선)
  baseValue: number    // startIdx 시점의 추세선 값
  touches:   number[]  // 터치 봉 인덱스 배열
}

/**
 * 상승 추세선 최적 구간 탐색
 * - 65봉 슬라이딩 윈도우를 전체 데이터에 적용
 * - 로컬 저점 쌍을 앵커로 추세선을 테스트
 * - 터치 횟수 많고 이탈 적은 구간을 최고 점수로 선정
 * - 실제 시장 노이즈(약간의 이탈 허용)로 자연스러운 결과 보장
 */
function findAscendingTrendline(data: CandleData[]): TLResult | null {
  const W = 65
  let best: TLResult | null = null
  let bestScore = -Infinity

  for (let s = 0; s + W <= data.length; s += 3) {
    const seg = data.slice(s, s + W)

    // 구간 전체 상승 여부 확인 (최소 7% 상승)
    if (seg[W - 1].close < seg[0].close * 1.07) continue

    // 로컬 저점 탐색: 양쪽 4봉보다 낮은 봉
    const mins: Array<{ i: number; v: number }> = []
    for (let i = 4; i < W - 4; i++) {
      let isMin = true
      for (let k = i - 4; k <= i + 4; k++) {
        if (k !== i && seg[k].low < seg[i].low) { isMin = false; break }
      }
      if (isMin) mins.push({ i, v: seg[i].low })
    }
    if (mins.length < 2) continue

    // 저점 쌍을 추세선 앵커로 테스트
    for (let a = 0; a < mins.length - 1; a++) {
      for (let b = a + 1; b < mins.length; b++) {
        const { i: i1, v: v1 } = mins[a]
        const { i: i2, v: v2 } = mins[b]

        if (i2 - i1 < 14) continue       // 최소 14봉 간격 필요
        if (v2 <= v1 * 1.001) continue   // 반드시 상향 기울기

        const slope = (v2 - v1) / (i2 - i1)
        let violations = 0
        const touches: number[] = []

        for (let k = i1; k <= i2; k++) {
          const tlV  = v1 + slope * (k - i1)
          const diff = (seg[k].low - tlV) / tlV

          // 실제 시장: 1.5% 이상 이탈은 violation, 2.5% 이내는 터치로 인정
          if (diff < -0.015) violations++
          else if (diff < 0.025) touches.push(k)
        }

        // 이탈 3봉 이내에서만 유효한 추세선으로 인정 (실제 시장의 자연스러운 노이즈 허용)
        if (violations > 3) continue

        // 점수: 터치 많을수록+, 이탈 적을수록+, 구간 길수록+
        const score = touches.length * 5 - violations * 4 + (i2 - i1) / 8
        if (score > bestScore) {
          bestScore = score
          best = { segment: seg, startIdx: i1, slope, baseValue: v1, touches }
        }
      }
    }
  }

  return best
}

type FibResult = {
  segment:    CandleData[]
  rallyLow:   number
  rallyHigh:  number
  closestFib: number   // 되돌림이 멈춘 피보나치 레벨 (0.382 / 0.5 / 0.618 등)
  bounceIdx:  number   // 되돌림 저점 인덱스 (segment 기준)
}

/**
 * 피보나치 되돌림 최적 구간 탐색
 * - 상승 → 되돌림 → 반등 구조를 1Y 전체에서 탐색
 * - 되돌림이 실제 피보나치 레벨 근처에서 멈추는 구간을 우선 선정
 * - 초보자가 "아, 여기서 지지받는구나"를 직관적으로 이해할 수 있는 구간
 */
function findFibPattern(data: CandleData[]): FibResult | null {
  let best: FibResult | null = null
  let bestScore = -Infinity

  const RALLY_W = 30
  const RETR_W  = 35

  for (let peakBar = RALLY_W; peakBar < data.length - RETR_W; peakBar++) {
    // 직전 30봉에서 랠리 시작 저점 탐색
    const s = Math.max(0, peakBar - RALLY_W)
    let lowBar = s
    for (let k = s; k < peakBar; k++) {
      if (data[k].low < data[lowBar].low) lowBar = k
    }

    const rallyLow   = data[lowBar].low
    const rallyHigh  = data[peakBar].high
    const rallyRange = rallyHigh - rallyLow
    const rallyPct   = rallyRange / rallyLow

    if (rallyPct < 0.12 || rallyPct > 1.5) continue  // 12~150% 랠리만
    if (peakBar - lowBar < 7) continue                // 최소 7봉 랠리

    // 이후 35봉에서 되돌림 저점 탐색
    const endBar = Math.min(data.length - 1, peakBar + RETR_W)
    let pullBar = peakBar
    let pullLow = rallyHigh
    for (let k = peakBar + 1; k <= endBar; k++) {
      if (data[k].low < pullLow) { pullLow = data[k].low; pullBar = k }
    }

    const retracePct = (rallyHigh - pullLow) / rallyRange
    if (retracePct < 0.12 || retracePct > 0.88) continue

    // 실제 피보나치 레벨과의 근접도 평가
    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786]
    const closest   = fibLevels.reduce((b, l) =>
      Math.abs(l - retracePct) < Math.abs(b - retracePct) ? l : b, 0.5)
    const proximity = Math.max(0, 1 - Math.abs(retracePct - closest) * 9)

    // 되돌림 이후 반등 확인 (최소 4% 회복해야 반등으로 인정)
    if (pullBar >= endBar - 3) continue
    const postHigh = Math.max(...data.slice(pullBar, endBar + 1).map(d => d.high))
    const recovery = (postHigh - pullLow) / pullLow
    if (recovery < 0.04) continue

    // 점수: 랠리 크기 + 피보나치 레벨 근접도 + 반등 크기
    const score = rallyPct * 30 + proximity * 45 + recovery * 15 + (pullBar - peakBar) / 5
    if (score > bestScore) {
      bestScore = score
      const segStart = Math.max(0, lowBar - 3)
      const segEnd   = Math.min(data.length - 1, pullBar + 12)
      best = {
        segment:    data.slice(segStart, segEnd + 1),
        rallyLow,
        rallyHigh,
        closestFib: closest,
        bounceIdx:  pullBar - segStart,
      }
    }
  }

  return best
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

function makeChart(el: HTMLDivElement, height: number): IChartApi {
  return createChart(el, {
    layout: { background: { type: ColorType.Solid, color: '#0d1117' }, textColor: '#6b7280' },
    grid:   { vertLines: { color: '#161b22' }, horzLines: { color: '#161b22' } },
    crosshair:       { mode: CrosshairMode.Magnet },
    rightPriceScale: { borderColor: '#2a2a45', scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale:       { borderColor: '#2a2a45', timeVisible: false, rightOffset: 3 },
    handleScroll: false,
    handleScale:  false,
    width:  el.clientWidth,
    height,
  })
}

interface Props { slug: IndicatorSlug }

export function MiniChartPreview({ slug }: Props) {
  const mainRef   = useRef<HTMLDivElement>(null)
  const subRef    = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)  // 피보나치 레이블 오버레이
  const [data,    setData]    = useState<CandleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const needsSub = slug === 'rsi' || slug === 'macd'

  // ── 데이터 fetch (모든 지표 공통: 실제 NVDA 1Y 데이터) ────────────────────
  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch('/api/candles?symbol=NVDA&period=1Y&timeUnit=daily')
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
      tlResult = findAscendingTrendline(data)
      preview  = tlResult?.segment ?? data.slice(-65)
    } else if (slug === 'fibonacci') {
      fibResult = findFibPattern(data)
      preview   = fibResult?.segment ?? data.slice(-60)
    } else if (slug === 'moving-average') {
      preview = data.slice(-200)
    } else {
      preview = data.slice(-90)
    }

    const mainHeight = needsSub ? 240 : 320
    const mainChart  = makeChart(mainRef.current, mainHeight)
    const candleSeries = mainChart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor:   '#26a69a', wickDownColor:   '#ef5350',
    })
    candleSeries.setData(preview as any)

    // ── 볼린저 밴드 ──────────────────────────────────────────
    if (slug === 'bollinger') {
      const { upper, middle, lower } = calcBollingerBands(preview)
      ;[
        { d: upper,  color: '#60a5fa', dash: false },
        { d: middle, color: '#94a3b8', dash: true  },
        { d: lower,  color: '#60a5fa', dash: false },
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
        { d: calcMA(preview, 5),   color: '#facc15' },
        { d: calcMA(preview, 20),  color: '#f97316' },
        { d: calcMA(preview, 60),  color: '#a78bfa' },
        { d: calcMA(preview, 120), color: '#f43f5e' },
      ].forEach(({ d, color }) =>
        mainChart.addLineSeries({
          color, lineWidth: 2,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }).setData(d as any)
      )
      const ma5  = calcMA(preview, 5)
      const ma20 = calcMA(preview, 20)
      const markers: any[] = []
      for (let i = 1; i < Math.min(ma5.length, ma20.length); i++) {
        if (ma5[i - 1].value < ma20[i - 1].value && ma5[i].value >= ma20[i].value)
          markers.push({ time: ma5[i].time, position: 'belowBar', color: '#fbbf24', shape: 'arrowUp', text: '골든크로스' })
      }
      if (markers.length) candleSeries.setMarkers(markers.slice(-1) as any)
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

        // 터치봉 마커 (연속된 터치는 묶어서 대표 1개만 표시 → 깔끔)
        const deduped: number[] = []
        let lastT = -10
        for (const t of [...touches].sort((a, b) => a - b)) {
          if (t - lastT >= 4) { deduped.push(t); lastT = t }
        }
        candleSeries.setMarkers(
          deduped.slice(0, 5).map(b => ({
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

      // 피보나치 캔버스 레이블용 데이터 (오른쪽 lastValueVisible 대신 왼쪽 canvas에 그림)
      const fibLabelData: { value: number; label: string; color: string }[] = []
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
          lastValueVisible: false,  // 오른쪽 레이블 제거
          priceLineVisible: false,
        }).setData([{ time: t0, value }, { time: t1, value }] as any)
        fibLabelData.push({ value, label: displayLabel, color })
      })

      // fitContent 처리 후 캔버스에 왼쪽 레이블 그리기
      const drawFibOnCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas || !mainRef.current) return
        canvas.width  = mainRef.current.clientWidth
        canvas.height = mainHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.font = 'bold 9px system-ui, sans-serif'
        fibLabelData.forEach(({ value, label, color }) => {
          const y = candleSeries.priceToCoordinate(value)
          if (y === null || y < 2 || y > mainHeight - 2) return
          const tw = ctx.measureText(label).width
          const bw = tw + 8, bh = 14
          const bx = 6, by = y - bh / 2
          ctx.fillStyle = color + 'dd'
          ctx.beginPath()
          if (typeof (ctx as any).roundRect === 'function') {
            ;(ctx as any).roundRect(bx, by, bw, bh, 3)
          } else {
            ctx.rect(bx, by, bw, bh)
          }
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, bx + bw / 2, y)
        })
        ctx.restore()
      }
      requestAnimationFrame(drawFibOnCanvas)

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
      subChart = makeChart(subRef.current, 130)
      const rsiData = calcRSI(preview)
      subChart.addLineSeries({ color: '#a78bfa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(rsiData as any)
      if (rsiData.length > 0) {
        const [t0, t1] = [rsiData[0].time, rsiData[rsiData.length - 1].time]
        subChart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 70 }, { time: t1, value: 70 }] as any)
        subChart.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false })
          .setData([{ time: t0, value: 30 }, { time: t1, value: 30 }] as any)
      }
      subChart.timeScale().fitContent()
    }

    // ── MACD 서브 차트 ────────────────────────────────────────
    if (slug === 'macd' && subRef.current) {
      subChart = makeChart(subRef.current, 130)
      const md = calcMACD(preview)
      subChart.addHistogramSeries({ color: '#26a69a', lastValueVisible: false, priceLineVisible: false })
        .setData(md.filter(d => d.histogram !== null)
          .map(d => ({ time: d.time, value: d.histogram!, color: d.histogram! >= 0 ? '#26a69a' : '#ef5350' })) as any)
      subChart.addLineSeries({ color: '#60a5fa', lineWidth: 2, lastValueVisible: true, priceLineVisible: false })
        .setData(md.map(d => ({ time: d.time, value: d.macd })) as any)
      subChart.addLineSeries({ color: '#f97316', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
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
    }
  }, [data, slug, needsSub])

  // ── 범례 ─────────────────────────────────────────────────────────────────
  const legends: { color: string; label: string }[] = []
  if (slug === 'bollinger')
    legends.push({ color: '#60a5fa', label: '밴드' }, { color: '#94a3b8', label: '중심(MA20)' })
  if (slug === 'moving-average')
    legends.push(
      { color: '#facc15', label: 'MA 5' }, { color: '#f97316', label: 'MA 20' },
      { color: '#a78bfa', label: 'MA 60' }, { color: '#f43f5e', label: 'MA 120' },
    )
  if (slug === 'rsi')
    legends.push({ color: '#a78bfa', label: 'RSI(14)' }, { color: '#ef4444', label: '70' }, { color: '#22c55e', label: '30' })
  if (slug === 'macd')
    legends.push({ color: '#60a5fa', label: 'MACD' }, { color: '#f97316', label: '시그널' })
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
      {/* 피보나치일 때는 canvas overlay 추가 (왼쪽 레이블 그리기용) */}
      <div className="relative w-full">
        <div ref={mainRef} className="w-full rounded-xl overflow-hidden" />
        {slug === 'fibonacci' && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none rounded-xl"
          />
        )}
      </div>
      {needsSub && <div ref={subRef} className="w-full rounded-xl overflow-hidden mt-0.5" />}
      <p className="text-right text-xs text-navi-border mt-1">
        NVDA · 실제 데이터 최적 구간 자동 선택
      </p>
    </div>
  )
}
