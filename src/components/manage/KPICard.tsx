interface KPICardProps {
  label:    string
  value:    string | number
  sub?:     string          // 보조 텍스트
  accent?:  boolean         // 강조 색상
  alert?:   boolean         // 경고 색상
  pct?:     number          // 0~100 % bar
  tooltip?: string          // ⓘ hover 설명 (계산식 등)
}

export function KPICard({ label, value, sub, accent, alert, pct, tooltip }: KPICardProps) {
  const borderColor = alert   ? 'border-navi-danger/30'
                    : accent  ? 'border-navi-action/30'
                    : 'border-navi-border'

  const valueColor  = alert   ? 'text-navi-danger'
                    : accent  ? 'text-navi-action'
                    : 'text-navi-text'

  return (
    <div className={`bg-navi-surface border ${borderColor} rounded-2xl p-4 flex flex-col gap-1.5`}>
      {/* 레이블 + ⓘ */}
      <div className="flex items-start gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navi-muted flex-1 leading-tight">
          {label}
        </p>
        {tooltip && (
          <div className="relative group shrink-0 mt-px">
            <span className="text-[11px] text-navi-muted/60 cursor-help select-none hover:text-navi-muted transition-colors">
              ⓘ
            </span>
            {/* 툴팁 패널 */}
            <div className="
              absolute right-0 top-5 z-50 w-60
              bg-[#1e2a3a] border border-[#334155] rounded-xl px-3 py-2.5
              shadow-xl opacity-0 pointer-events-none
              group-hover:opacity-100 group-hover:pointer-events-auto
              transition-opacity duration-150
            ">
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed whitespace-pre-line">
                {tooltip}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 값 */}
      <p className={`text-[26px] font-black leading-none ${valueColor}`}>{value}</p>

      {/* 보조 텍스트 */}
      {sub && <p className="text-[11px] text-navi-muted">{sub}</p>}

      {/* % 바 */}
      {pct !== undefined && (
        <div className="mt-1 h-1 bg-navi-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${alert ? 'bg-navi-danger' : 'bg-navi-action'}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      )}
    </div>
  )
}
