import type { CandleData } from '@/types'

// 결정론적 LCG 난수 생성기
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0xffffffff
  }
}

// NVDA 2023년 실제 흐름을 모사한 목 데이터
// $150 → $495 강한 상승 추세 + 중간 조정 구간
function generateNVDALike(): CandleData[] {
  const rng    = makeRng(20230102)
  const volRng = makeRng(20230103)  // 거래량 전용 별도 시드
  const data: CandleData[] = []

  // 구간별 추세 설정 (baseVol: 일 평균 거래량 백만 단위)
  const phases = [
    { days: 40, drift:  2.5, vol: 4.0, baseVol: 40 },  // 1월~2월 완만한 상승
    { days: 20, drift: -1.5, vol: 5.0, baseVol: 55 },  // 3월 초 조정 (거래량↑)
    { days: 60, drift:  5.0, vol: 6.0, baseVol: 80 },  // 3월말~6월 AI 급등 (거래량 폭증)
    { days: 15, drift: -2.0, vol: 6.0, baseVol: 70 },  // 6월 조정
    { days: 50, drift:  2.0, vol: 4.5, baseVol: 45 },  // 7월~9월 횡보 후 재상승
    { days: 20, drift: -3.0, vol: 5.5, baseVol: 60 },  // 10월 조정
    { days: 55, drift:  3.5, vol: 5.0, baseVol: 50 },  // 11월~1월 연말 랠리
  ]

  let price = 150
  const start = new Date('2023-01-02')
  let dayOffset = 0

  for (const phase of phases) {
    let phaseDays = 0
    while (phaseDays < phase.days) {
      const d = new Date(start)
      d.setDate(start.getDate() + dayOffset)
      dayOffset++
      if (d.getDay() === 0 || d.getDay() === 6) continue
      phaseDays++

      const dailyDrift = phase.drift * (0.5 + rng() * 0.8)
      const noise = (rng() - 0.5) * phase.vol
      const open = Math.round(price * 100) / 100
      const close = Math.max(50, Math.round((price + dailyDrift + noise) * 100) / 100)
      const high = Math.round((Math.max(open, close) + rng() * phase.vol * 0.8) * 100) / 100
      const low  = Math.round((Math.min(open, close) - rng() * phase.vol * 0.8) * 100) / 100
      price = close

      // 거래량: 기본 + 가격 변동폭에 비례 + 무작위
      const priceMove = Math.abs(close - open) / open
      const volMultiplier = 1 + priceMove * 8 + (volRng() - 0.3) * 0.8
      const volume = Math.round(phase.baseVol * volMultiplier * 1_000_000)

      data.push({
        time:  d.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      })
    }
  }

  return data
}

export const allDailyData: CandleData[] = generateNVDALike()

// 일봉 → 주봉
export function toWeekly(daily: CandleData[]): CandleData[] {
  const weeks: Record<string, CandleData[]> = {}
  for (const c of daily) {
    const d   = new Date(c.time)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const key = mon.toISOString().split('T')[0]
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(c)
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, cs]) => ({
      time,
      open:   cs[0].open,
      high:   Math.max(...cs.map((c) => c.high)),
      low:    Math.min(...cs.map((c) => c.low)),
      close:  cs[cs.length - 1].close,
      volume: cs.reduce((s, c) => s + (c.volume ?? 0), 0) || undefined,
    }))
}

// 일봉 → 월봉
export function toMonthly(daily: CandleData[]): CandleData[] {
  const months: Record<string, CandleData[]> = {}
  for (const c of daily) {
    const key = c.time.slice(0, 7) + '-01'
    if (!months[key]) months[key] = []
    months[key].push(c)
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, cs]) => ({
      time,
      open:   cs[0].open,
      high:   Math.max(...cs.map((c) => c.high)),
      low:    Math.min(...cs.map((c) => c.low)),
      close:  cs[cs.length - 1].close,
      volume: cs.reduce((s, c) => s + (c.volume ?? 0), 0) || undefined,
    }))
}

export type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL'

export function filterByPeriod(daily: CandleData[], period: Period): CandleData[] {
  if (period === 'ALL') return daily
  const last   = new Date(daily[daily.length - 1].time)
  const cutoff = new Date(last)
  if (period === '1M') cutoff.setMonth(last.getMonth() - 1)
  if (period === '3M') cutoff.setMonth(last.getMonth() - 3)
  if (period === '6M') cutoff.setMonth(last.getMonth() - 6)
  if (period === '1Y') cutoff.setFullYear(last.getFullYear() - 1)
  return daily.filter((c) => new Date(c.time) >= cutoff)
}

export const mockCandleData = allDailyData.slice(-30)
