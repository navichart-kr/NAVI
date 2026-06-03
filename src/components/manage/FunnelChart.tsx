/**
 * 사용자 여정 퍼널 시각화
 * - 단계별 인원 + 전환율 + 이탈율
 * - 이탈 설명: "홈 방문자 중 87%가 튜토리얼을 시작하지 않음" 형식
 * - 텍스트 절대 truncate 금지
 */

interface FunnelStep {
  label:  string
  event:  string
  count:  number
  prev?:  number
}

interface Props {
  steps: FunnelStep[]
}

export function FunnelChart({ steps }: Props) {
  const maxCount = Math.max(...steps.map(s => s.count), 1)

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const widthPct   = Math.round((step.count / maxCount) * 100)
        const convRate   = step.prev && step.prev > 0
          ? Math.round((step.count / step.prev) * 100)
          : 100
        const dropPct    = i > 0 ? 100 - convRate : 0
        const isAlert    = i > 0 && convRate < 60
        const prevLabel  = i > 0 ? steps[i - 1].label : null

        return (
          <div key={i}>
            {/* ── 단계 행 ── */}
            <div className="flex items-start gap-3 py-1.5">
              {/* 번호 */}
              <span className="mt-2 w-5 shrink-0 text-[10px] font-bold text-navi-muted text-center leading-none">
                {i + 1}
              </span>

              {/* 바 + 레이블 */}
              <div className="flex-1 min-w-0">
                <div className="relative h-9 bg-navi-surface2 rounded-lg overflow-hidden">
                  {/* 채워진 바 */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ${
                      isAlert
                        ? 'bg-navi-danger/20 border-l-2 border-navi-danger'
                        : i === 0
                        ? 'bg-navi-action/30'
                        : 'bg-navi-action/20'
                    }`}
                    style={{ width: `${Math.max(widthPct, 6)}%` }}
                  />
                  {/* 텍스트 오버레이 — 절대 truncate 없음 */}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className={`text-[12px] font-semibold whitespace-nowrap ${
                      isAlert ? 'text-navi-danger' : 'text-navi-text'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* 수치 */}
              <div className="shrink-0 text-right pt-1">
                <p className="text-[14px] font-bold text-navi-text leading-tight">
                  {step.count.toLocaleString()}명
                </p>
                {i > 0 && (
                  <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${
                    isAlert ? 'text-navi-danger' : 'text-[#34D399]'
                  }`}>
                    {convRate}% 전환
                  </p>
                )}
              </div>
            </div>

            {/* ── 단계 사이 이탈 설명 ── */}
            {i < steps.length - 1 && (
              <div className="ml-8 flex items-start gap-2 pb-1">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-px h-3 bg-navi-border" />
                  <div className="w-1 h-1 rounded-full bg-navi-border" />
                  <div className="w-px h-3 bg-navi-border" />
                </div>
                {dropPct > 0 && (
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${
                    isAlert ? 'text-navi-danger font-semibold' : 'text-navi-muted'
                  }`}>
                    {isAlert && '⚠ '}
                    {prevLabel} 중 <span className="font-bold">{dropPct}%</span>가{' '}
                    {steps[i + 1].label}(으)로 이어지지 않음
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
