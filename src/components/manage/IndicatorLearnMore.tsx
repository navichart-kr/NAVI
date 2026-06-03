/**
 * 지표 더 알아보기 분석
 * 조회수 · 차트 복귀 수 · 복귀율
 */

const INDICATOR_LABELS: Record<string, string> = {
  rsi:        'RSI',
  macd:       'MACD',
  bb:         'Bollinger Bands',
  ma:         'Moving Average',
  trendline:  'Trendline',
  fibonacci:  'Fibonacci',
}

export interface LearnMoreItem {
  indicator:   string
  learn_more:  number   // indicator_learn_more_opened
  page_viewed: number   // indicator_page_viewed
  cta_clicked: number   // indicator_cta_clicked
  return_rate: number   // cta_clicked / page_viewed × 100
}

interface Props {
  data: LearnMoreItem[]
}

export function IndicatorLearnMore({ data }: Props) {
  if (!data.length) {
    return <p className="text-[12px] text-navi-muted">데이터 없음</p>
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="grid grid-cols-[1fr_72px_72px_72px_64px] text-[10px] font-bold uppercase tracking-[0.06em] text-navi-muted px-2 pb-2 mb-1 border-b border-navi-border/40">
        <span>지표</span>
        <span className="text-right">더보기 클릭</span>
        <span className="text-right">페이지뷰</span>
        <span className="text-right">차트 복귀</span>
        <span className="text-right">복귀율</span>
      </div>

      <div className="space-y-0.5">
        {data.map((d, i) => {
          const label      = INDICATOR_LABELS[d.indicator] ?? d.indicator
          const isGood     = d.return_rate >= 50
          const isAlert    = d.return_rate > 0 && d.return_rate < 25

          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_72px_72px_72px_64px] items-center px-2 py-2 rounded-lg hover:bg-navi-surface2/50 transition-colors"
            >
              <span className="text-[12px] font-semibold text-navi-text">{label}</span>
              <span className="text-[12px] text-navi-secondary text-right">
                {d.learn_more.toLocaleString()}
              </span>
              <span className="text-[12px] text-navi-secondary text-right">
                {d.page_viewed.toLocaleString()}
              </span>
              <span className="text-[12px] text-navi-secondary text-right">
                {d.cta_clicked.toLocaleString()}
              </span>
              <span className={`text-[13px] font-bold text-right ${
                isGood  ? 'text-[#34D399]'
                : isAlert ? 'text-navi-danger'
                :          'text-navi-text'
              }`}>
                {d.page_viewed > 0 ? `${d.return_rate}%` : '–'}
              </span>
            </div>
          )
        })}
      </div>

      {/* 설명 */}
      <p className="mt-3 text-[11px] text-navi-muted leading-relaxed border-t border-navi-border/30 pt-2">
        복귀율 = "차트에서 직접 확인해보기" 클릭 수 / 페이지뷰 × 100
      </p>
    </div>
  )
}
