/**
 * patternDetector.ts — 캔들 패턴 & 거래량 패턴 자동 탐지
 *
 * 실제 차트 데이터에서 가장 교육적 가치가 높은 구간을 자동으로 찾아
 * 학습 오버레이에 전달합니다.
 */

import type { CandleData } from '@/types'

export type PatternType =
  | 'doji'
  | 'hammer'
  | 'inverted-hammer'
  | 'bullish-engulfing'
  | 'bearish-engulfing'
  | 'shooting-star'
  | 'marubozu'

export type VolumeTopicType =
  | 'intro'
  | 'up-surge'
  | 'down-surge'
  | 'divergence'
  | 'quiz'

export interface PatternLocation {
  /** 패턴의 주 캔들 데이터 인덱스 */
  candleIndex: number
  /** 이전 캔들 인덱스 (장악형 패턴용) */
  prevCandleIndex?: number
  /** 차트 가시 범위 시작 (logical index) */
  windowFrom: number
  /** 차트 가시 범위 끝 */
  windowTo: number
  /** 패턴 이후 실제 방향 (5일 평균) */
  outcome: 'up' | 'down' | 'sideways'
}

/* ─── 상수 ────────────────────────────────────────── */
const CONTEXT     = 22   // 패턴 전후로 보여줄 봉 수
const MIN_IDX     = 12   // 패턴 탐지 시작 인덱스 (lookback 확보)
const NEED_FUTURE = 8    // 결과 확인용 미래 봉 최소 수

/* ─── 내부 헬퍼 ──────────────────────────────────── */

function getOutcome(
  data: CandleData[],
  index: number,
  horizon = 5,
): 'up' | 'down' | 'sideways' {
  if (index + horizon >= data.length) return 'sideways'
  const base    = data[index].close
  const futures = data.slice(index + 1, index + horizon + 1)
  const avg     = futures.reduce((s, c) => s + c.close, 0) / futures.length
  const pct     = (avg - base) / base
  if (pct >  0.018) return 'up'
  if (pct < -0.018) return 'down'
  return 'sideways'
}

function isDowntrend(data: CandleData[], index: number, lookback = 6): boolean {
  if (index < lookback) return false
  const slice = data.slice(index - lookback, index)
  let down = 0
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close < slice[i - 1].close) down++
  }
  return down >= Math.floor(lookback * 0.5)
}

function isUptrend(data: CandleData[], index: number, lookback = 6): boolean {
  if (index < lookback) return false
  const slice = data.slice(index - lookback, index)
  let up = 0
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close > slice[i - 1].close) up++
  }
  return up >= Math.floor(lookback * 0.5)
}

/* ─── 개별 패턴 감지 함수 ─────────────────────────── */

/** 도지: 몸통이 전체 범위의 12% 미만 */
function isDoji(c: CandleData): boolean {
  const body  = Math.abs(c.close - c.open)
  const range = c.high - c.low
  if (range < c.close * 0.004) return false  // 너무 작은 범위 제외
  return body / range < 0.12
}

/**
 * 망치형: 아래 꼬리 >= 2× 몸통, 위 꼬리 <= 1.2× 몸통
 * 하락 추세 직후여야 함
 */
function isHammer(c: CandleData): boolean {
  const body    = Math.abs(c.close - c.open)
  const bodyBot = Math.min(c.open, c.close)
  const bodyTop = Math.max(c.open, c.close)
  const lower   = bodyBot - c.low
  const upper   = c.high - bodyTop
  const range   = c.high - c.low
  if (range < c.close * 0.004) return false
  const minBody = Math.max(body, c.close * 0.001)
  return lower >= 2 * minBody && upper <= minBody * 1.2
}

/**
 * 역망치형: 위 꼬리 >= 2× 몸통, 아래 꼬리 <= 1.2× 몸통
 */
function isInvertedHammer(c: CandleData): boolean {
  const body    = Math.abs(c.close - c.open)
  const bodyBot = Math.min(c.open, c.close)
  const bodyTop = Math.max(c.open, c.close)
  const lower   = bodyBot - c.low
  const upper   = c.high - bodyTop
  const range   = c.high - c.low
  if (range < c.close * 0.004) return false
  const minBody = Math.max(body, c.close * 0.001)
  return upper >= 2 * minBody && lower <= minBody * 1.2
}

/** 상승 장악형: 전봉 음봉, 당봉 양봉이며 몸통이 전봉 몸통을 완전히 장악 */
function isBullishEngulfing(prev: CandleData, curr: CandleData): boolean {
  if (prev.close >= prev.open) return false   // prev = 음봉이어야
  if (curr.close <= curr.open) return false   // curr = 양봉이어야
  return curr.open <= prev.close && curr.close >= prev.open
}

/** 하락 장악형: 전봉 양봉, 당봉 음봉이며 몸통이 전봉 몸통을 완전히 장악 */
function isBearishEngulfing(prev: CandleData, curr: CandleData): boolean {
  if (prev.close <= prev.open) return false   // prev = 양봉이어야
  if (curr.close >= curr.open) return false   // curr = 음봉이어야
  return curr.open >= prev.close && curr.close <= prev.open
}

/**
 * 유성형: 위 꼬리 >= 2× 몸통, 아래 꼬리 <= 0.3× 몸통, 상승 추세 직후
 */
function isShootingStar(c: CandleData): boolean {
  const body    = Math.abs(c.close - c.open)
  const bodyBot = Math.min(c.open, c.close)
  const bodyTop = Math.max(c.open, c.close)
  const lower   = bodyBot - c.low
  const upper   = c.high - bodyTop
  const range   = c.high - c.low
  if (range < c.close * 0.004) return false
  const minBody = Math.max(body, c.close * 0.001)
  return upper >= 2 * minBody && lower <= minBody * 0.3
}

/**
 * 장대양봉: 양봉이며 몸통이 전체 범위의 75% 이상, 최소 1.5% 일중 변동
 */
function isMarubozu(c: CandleData): boolean {
  if (c.close <= c.open) return false
  const body  = c.close - c.open
  const range = c.high - c.low
  if (range < c.close * 0.015) return false
  return body / range >= 0.75
}

/* ─── 퍼블릭 API: 캔들 패턴 ──────────────────────── */

export function findBestCandlePattern(
  data: CandleData[],
  type: PatternType,
  preferOutcome?: 'up' | 'down' | 'sideways',
): PatternLocation | null {
  interface Candidate {
    index: number
    prevIndex?: number
    strength: number
  }
  const candidates: Candidate[] = []
  const maxIdx = data.length - NEED_FUTURE

  for (let i = MIN_IDX; i < maxIdx; i++) {
    const c = data[i]
    const p = data[i - 1]

    switch (type) {

      case 'doji': {
        if (!isDoji(c)) break
        const ratio = Math.abs(c.close - c.open) / ((c.high - c.low) + 0.001)
        candidates.push({ index: i, strength: (1 - ratio) * 100 })
        break
      }

      case 'hammer': {
        if (!isHammer(c) || !isDowntrend(data, i)) break
        const minBody  = Math.max(Math.abs(c.close - c.open), c.close * 0.001)
        const lower    = Math.min(c.open, c.close) - c.low
        candidates.push({ index: i, strength: Math.min(100, (lower / minBody) * 15) })
        break
      }

      case 'inverted-hammer': {
        if (!isInvertedHammer(c) || !isDowntrend(data, i)) break
        const minBody = Math.max(Math.abs(c.close - c.open), c.close * 0.001)
        const upper   = c.high - Math.max(c.open, c.close)
        candidates.push({ index: i, strength: Math.min(100, (upper / minBody) * 15) })
        break
      }

      case 'bullish-engulfing': {
        if (i < 1 || !isBullishEngulfing(p, c)) break
        const prevBody = Math.max(p.open - p.close, 0.001)
        const currBody = c.close - c.open
        candidates.push({
          index: i, prevIndex: i - 1,
          strength: Math.min(100, (currBody / prevBody) * 40),
        })
        break
      }

      case 'bearish-engulfing': {
        if (i < 1 || !isBearishEngulfing(p, c)) break
        const prevBody = Math.max(p.close - p.open, 0.001)
        const currBody = c.open - c.close
        candidates.push({
          index: i, prevIndex: i - 1,
          strength: Math.min(100, (currBody / prevBody) * 40),
        })
        break
      }

      case 'shooting-star': {
        if (!isShootingStar(c) || !isUptrend(data, i)) break
        const minBody = Math.max(Math.abs(c.close - c.open), c.close * 0.001)
        const upper   = c.high - Math.max(c.open, c.close)
        candidates.push({ index: i, strength: Math.min(100, (upper / minBody) * 15) })
        break
      }

      case 'marubozu': {
        if (!isMarubozu(c)) break
        const body  = c.close - c.open
        const range = c.high - c.low
        candidates.push({ index: i, strength: Math.min(100, (body / range) * 100) })
        break
      }
    }
  }

  if (!candidates.length) return null

  const buildLocation = (c: Candidate) => ({
    candleIndex:     c.index,
    prevCandleIndex: c.prevIndex,
    windowFrom:      Math.max(0, c.index - CONTEXT),
    windowTo:        Math.min(data.length - 1, c.index + CONTEXT),
    outcome:         getOutcome(data, c.index),
  })

  // preferOutcome 일치 후보 우선 — 망치형 = 실제 상승, 유성형 = 실제 하락 등
  // 교육 효과 극대화: 신호가 실제로 적중한 사례 우선 선택
  if (preferOutcome) {
    const matching = candidates.filter(c => getOutcome(data, c.index) === preferOutcome)
    if (matching.length > 0) {
      matching.sort((a, b) => b.strength - a.strength)
      return buildLocation(matching[0])
    }
  }

  // 일치 후보 없음 → 강도(strength) 기준 상위 패턴
  candidates.sort((a, b) => b.strength - a.strength)
  return buildLocation(candidates[0])
}

/* ─── 퍼블릭 API: 거래량 패턴 ────────────────────── */

function calcAvgVolume(data: CandleData[]): number {
  const vols = data.filter(c => c.volume != null).map(c => c.volume!)
  if (!vols.length) return 0
  return vols.reduce((s, v) => s + v, 0) / vols.length
}

export function findVolumePattern(
  data: CandleData[],
  type: VolumeTopicType,
): PatternLocation | null {
  const avg    = calcAvgVolume(data)
  if (!avg) return null
  const maxIdx = data.length - NEED_FUTURE

  switch (type) {

    case 'intro': {
      // 전체 데이터에서 거래량이 가장 높은 날
      let bestIdx = MIN_IDX, bestVol = 0
      for (let i = MIN_IDX; i < maxIdx; i++) {
        const v = data[i].volume ?? 0
        if (v > bestVol) { bestVol = v; bestIdx = i }
      }
      return {
        candleIndex: bestIdx,
        windowFrom:  Math.max(0, bestIdx - CONTEXT),
        windowTo:    Math.min(data.length - 1, bestIdx + CONTEXT),
        outcome:     getOutcome(data, bestIdx),
      }
    }

    case 'up-surge': {
      // 거래량 급증 + 가격 상승 + 이후 상승 지속
      for (let i = MIN_IDX; i < maxIdx; i++) {
        const c   = data[i]
        const vol = c.volume ?? 0
        const pct = (c.close - c.open) / c.open
        if (pct > 0.012 && vol > avg * 1.4 && getOutcome(data, i, 4) === 'up') {
          return {
            candleIndex: i,
            windowFrom:  Math.max(0, i - 18),
            windowTo:    Math.min(data.length - 1, i + 18),
            outcome:     'up',
          }
        }
      }
      // fallback: 최고 점수 상승 + 거래량 날
      let best = { idx: MIN_IDX, score: -Infinity }
      for (let i = MIN_IDX; i < maxIdx; i++) {
        const c   = data[i]
        const vol = c.volume ?? 0
        const pct = (c.close - c.open) / c.open
        if (pct > 0 && vol > avg) {
          const s = pct * (vol / avg)
          if (s > best.score) { best = { idx: i, score: s } }
        }
      }
      return {
        candleIndex: best.idx,
        windowFrom:  Math.max(0, best.idx - 18),
        windowTo:    Math.min(data.length - 1, best.idx + 18),
        outcome:     getOutcome(data, best.idx),
      }
    }

    case 'down-surge': {
      // 거래량 급증 + 가격 하락 + 이후 하락 지속
      for (let i = MIN_IDX; i < maxIdx; i++) {
        const c   = data[i]
        const vol = c.volume ?? 0
        const pct = (c.close - c.open) / c.open
        if (pct < -0.012 && vol > avg * 1.4 && getOutcome(data, i, 4) === 'down') {
          return {
            candleIndex: i,
            windowFrom:  Math.max(0, i - 18),
            windowTo:    Math.min(data.length - 1, i + 18),
            outcome:     'down',
          }
        }
      }
      let best = { idx: MIN_IDX, score: -Infinity }
      for (let i = MIN_IDX; i < maxIdx; i++) {
        const c   = data[i]
        const vol = c.volume ?? 0
        const pct = (c.close - c.open) / c.open
        if (pct < 0 && vol > avg) {
          const s = Math.abs(pct) * (vol / avg)
          if (s > best.score) { best = { idx: i, score: s } }
        }
      }
      return {
        candleIndex: best.idx,
        windowFrom:  Math.max(0, best.idx - 18),
        windowTo:    Math.min(data.length - 1, best.idx + 18),
        outcome:     getOutcome(data, best.idx),
      }
    }

    case 'divergence': {
      // 가격 5일 상승 + 거래량 감소 (bearish divergence)
      for (let i = MIN_IDX + 5; i < maxIdx; i++) {
        const priceUp  = data[i].close > data[i - 5].close * 1.01
        const vols     = data.slice(i - 5, i + 1).map(c => c.volume ?? 0)
        const volTrend = vols[0] > 0 && (vols[vols.length - 1] / vols[0]) < 0.75
        if (priceUp && volTrend) {
          return {
            candleIndex: i,
            windowFrom:  Math.max(0, i - 18),
            windowTo:    Math.min(data.length - 1, i + 18),
            outcome:     getOutcome(data, i),
          }
        }
      }
      // fallback
      return findVolumePattern(data, 'up-surge')
    }

    case 'quiz': {
      // 최근 절반 구간에서 가장 거래량이 높은 날을 문제로
      const start = Math.floor(maxIdx * 0.5)
      let bestIdx = start, bestVol = 0
      for (let i = start; i < maxIdx; i++) {
        const v = data[i].volume ?? 0
        if (v > bestVol) { bestVol = v; bestIdx = i }
      }
      return {
        candleIndex: bestIdx,
        windowFrom:  Math.max(0, bestIdx - 18),
        windowTo:    Math.min(data.length - 1, bestIdx + 18),
        outcome:     getOutcome(data, bestIdx),
      }
    }
  }
}
