/**
 * AI 인사이트 카드
 * 데이터를 자동 분석해 운영자가 바로 이해할 수 있는 요약 제공
 */

export interface Insight {
  icon:   string
  title:  string   // 10자 이내
  value:  string   // 핵심 값 (굵게 표시)
  sub?:   string   // 보조 설명
  alert?: boolean  // 경고 강조
  good?:  boolean  // 긍정 강조
}

interface Props {
  insights: Insight[]
}

export function InsightCards({ insights }: Props) {
  if (!insights.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {insights.map((ins, i) => (
        <div
          key={i}
          className={`
            rounded-2xl border p-4 flex flex-col gap-1.5
            ${ins.alert ? 'bg-navi-danger/[0.06] border-navi-danger/30'
            : ins.good  ? 'bg-navi-action/[0.06] border-navi-action/30'
            :             'bg-navi-surface2 border-navi-border'}
          `}
        >
          <span className="text-xl leading-none">{ins.icon}</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navi-muted leading-tight mt-0.5">
            {ins.title}
          </p>
          <p className={`text-[15px] font-black leading-tight ${
            ins.alert ? 'text-navi-danger' : ins.good ? 'text-navi-action' : 'text-navi-text'
          }`}>
            {ins.value}
          </p>
          {ins.sub && (
            <p className="text-[10px] text-navi-muted leading-snug">{ins.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}
