/**
 * 랜딩 페이지 데모 차트 데이터 (고정 시드 — API 불필요)
 * 상승 → 조정 → 재상승 패턴으로 MA·RSI·MACD 학습에 최적화
 */

export interface DemoCandle {
  o: number
  h: number
  l: number
  c: number
}

// xorshift32 PRNG (시드 고정 → 항상 동일한 데이터)
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return (s >>> 0) / 0x100000000
  }
}

function gen(): DemoCandle[] {
  const r = makeRng(0xc0ffee42)
  const candles: DemoCandle[] = []
  let price = 420

  for (let i = 0; i < 72; i++) {
    // 구간별 추세 편향
    let bias: number
    if (i < 18)      bias =  0.0045   // 상승
    else if (i < 28) bias = -0.0055   // 조정
    else if (i < 50) bias =  0.0060   // 강한 재상승
    else if (i < 58) bias = -0.0030   // 소폭 조정
    else             bias =  0.0040   // 회복

    const noise   = (r() - 0.48) * 0.030
    const o = price
    const c = o * (1 + bias + noise)
    const wickH = o * r() * 0.014
    const wickL = o * r() * 0.014
    const h = Math.max(o, c) + wickH
    const l = Math.min(o, c) - wickL
    candles.push({
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
    })
    price = c
  }
  return candles
}

export const DEMO_CANDLES: DemoCandle[] = gen()

// ─── MA 계산 ─────────────────────────────────────────────────
export function calcDemoMA(candles: DemoCandle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null
    return candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.c, 0) / period
  })
}

// ─── RSI 계산 ────────────────────────────────────────────────
export function calcDemoRSI(candles: DemoCandle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const d = candles[i].c - candles[i - 1].c
    if (d > 0) avgGain += d
    else       avgLoss += -d
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = 100 - 100 / (1 + rs)

  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].c - candles[i - 1].c
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
    const rsv = avgLoss === 0 ? 100 : avgGain / avgLoss
    result[i] = 100 - 100 / (1 + rsv)
  }
  return result
}

// ─── MACD 계산 ───────────────────────────────────────────────
function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = data[0]
  result.push(prev)
  for (let i = 1; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

export interface MACDPoint {
  macd: number
  signal: number | null
  hist: number | null
}

export function calcDemoMACD(
  candles: DemoCandle[],
  fast = 12, slow = 26, sig = 9
): MACDPoint[] {
  const closes = candles.map(c => c.c)
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = emaFast.map((v, i) => v - emaSlow[i])

  const sigLine = ema(macdLine.slice(slow - 1), sig)
  return candles.map((_, i) => {
    const m = macdLine[i]
    const sIdx = i - (slow - 1)
    const s = sIdx >= 0 && sIdx < sigLine.length ? sigLine[sIdx] : null
    return { macd: m, signal: s, hist: s !== null ? m - s : null }
  })
}

// ─── SVG 좌표 헬퍼 ───────────────────────────────────────────
export const CHART_W = 800
export const CANDLE_H = 240   // 메인 캔들 영역 높이
export const SUB_H    = 68    // RSI / MACD 서브 패널 높이

const N = DEMO_CANDLES.length

export function barX(i: number): number {
  const slotW = CHART_W / N
  return slotW * i + slotW * 0.5
}

export function barW(): number {
  return (CHART_W / N) * 0.60
}

// 메인 캔들 영역 Y 매핑
const allPrices = DEMO_CANDLES.flatMap(c => [c.h, c.l])
const PRICE_MIN = Math.min(...allPrices)
const PRICE_MAX = Math.max(...allPrices)
const PRICE_PAD = (PRICE_MAX - PRICE_MIN) * 0.05

export function priceY(p: number): number {
  return CANDLE_H - ((p - PRICE_MIN + PRICE_PAD) / (PRICE_MAX - PRICE_MIN + PRICE_PAD * 2)) * (CANDLE_H - 4) - 2
}

// 서브 패널 Y 매핑 (valueMin~valueMax → SUB_H)
export function subY(v: number, vMin: number, vMax: number): number {
  return SUB_H - ((v - vMin) / (vMax - vMin)) * (SUB_H - 6) - 3
}

// MA 색상
export const MA_COLORS = {
  5:  '#FBBF24',
  20: '#60A5FA',
  60: '#A78BFA',
}
