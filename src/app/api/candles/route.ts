import { NextRequest, NextResponse } from 'next/server'

// period + timeUnit → Yahoo Finance 파라미터 매핑
const RANGE_MAP: Record<string, string> = {
  '1M':  '1mo',
  '3M':  '3mo',
  '6M':  '6mo',
  '1Y':  '1y',
  'ALL': '5y',
}

const INTERVAL_MAP: Record<string, string> = {
  daily:   '1d',
  weekly:  '1wk',
  monthly: '1mo',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol   = searchParams.get('symbol')   || 'NVDA'
  const period   = searchParams.get('period')   || '1Y'
  const timeUnit = searchParams.get('timeUnit') || 'daily'

  const range    = RANGE_MAP[period]    || '1y'
  const interval = INTERVAL_MAP[timeUnit] || '1d'

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5분 캐시
    })

    if (!res.ok) {
      return NextResponse.json({ error: '데이터 조회 실패' }, { status: res.status })
    }

    const json = await res.json()
    const result = json?.chart?.result?.[0]

    if (!result) {
      return NextResponse.json({ error: '데이터 없음' }, { status: 404 })
    }

    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators.quote[0]

    const candles = timestamps
      .map((ts, i) => {
        const open   = quote.open?.[i]
        const high   = quote.high?.[i]
        const low    = quote.low?.[i]
        const close  = quote.close?.[i]
        const volume = quote.volume?.[i]
        if (!open || !high || !low || !close) return null

        const date = new Date(ts * 1000)
        const time = date.toISOString().split('T')[0]

        return {
          time,
          open:   Math.round(open  * 100) / 100,
          high:   Math.round(high  * 100) / 100,
          low:    Math.round(low   * 100) / 100,
          close:  Math.round(close * 100) / 100,
          volume: volume ? Math.round(volume) : undefined,
        }
      })
      .filter(Boolean)

    return NextResponse.json(candles)
  } catch (err) {
    console.error('[candles API error]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
