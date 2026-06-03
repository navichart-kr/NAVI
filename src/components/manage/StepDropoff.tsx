/**
 * 튜토리얼 단계별 이탈 분석
 * - 실제 단계명 사용 (Step1/2/3 아님)
 * - 도달 인원 / 전체 도달률 / 이전 단계 대비 이탈률
 * - 이탈이 심한 단계 빨간 강조
 */

const BASIC_STEP_NAMES: Record<number, string> = {
  1:  '캔들 클릭',
  2:  '추세선 소개',
  3:  '이동평균선(MA) 활성화',
  4:  'MA 방향 퀴즈',
  5:  'RSI 활성화',
  6:  'RSI 위치 퀴즈',
  7:  'MACD 활성화',
  8:  'MACD 위치 퀴즈',
  9:  '볼린저 밴드 활성화',
  10: 'BB 간격 퀴즈',
  11: '피보나치 소개',
  12: '심화학습 안내',
  13: '종합 테스트',
  14: '튜토리얼 완료',
  15: '챌린지 소개',
  16: '기초 과정 완료',
}

interface Step {
  step:  number
  users: number
  topic?: string   // 심화학습 topic
}

interface Props {
  steps:  Step[]
  title?: string
  type?:  'basic' | 'advanced'
}

const ALERT_THRESHOLD = 70   // 이전 대비 70% 미만이면 경고

export function StepDropoff({ steps, title, type = 'basic' }: Props) {
  if (!steps.length) return <p className="text-[12px] text-navi-muted">데이터 없음</p>

  const firstUsers = steps[0]?.users ?? 1

  return (
    <div className="space-y-0.5">
      {title && (
        <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
          {title}
        </p>
      )}

      {/* 헤더 */}
      <div className="flex items-center gap-2 px-2 pb-2 border-b border-navi-border/40 mb-1">
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-[10px] font-bold text-navi-muted uppercase tracking-[0.06em]">
          단계
        </span>
        <span className="w-32 shrink-0" />   {/* 바 */}
        <span className="w-12 shrink-0 text-right text-[10px] font-bold text-navi-muted uppercase tracking-[0.06em]">
          도달률
        </span>
        <span className="w-14 shrink-0 text-right text-[10px] font-bold text-navi-muted uppercase tracking-[0.06em]">
          인원
        </span>
        <span className="w-14 shrink-0 text-right text-[10px] font-bold text-navi-muted uppercase tracking-[0.06em]">
          이탈
        </span>
      </div>

      {steps.map((s, i) => {
        const prev       = i > 0 ? (steps[i - 1]?.users ?? 1) : s.users
        const convRate   = prev > 0 ? Math.round((s.users / prev) * 100)  : 100
        const absRate    = firstUsers > 0 ? Math.round((s.users / firstUsers) * 100) : 0
        const dropPct    = i > 0 ? 100 - convRate : 0
        const isAlert    = i > 0 && convRate < ALERT_THRESHOLD
        const stepName   = type === 'basic'
          ? (BASIC_STEP_NAMES[s.step] ?? `Step ${s.step}`)
          : `Step ${s.step}`

        return (
          <div
            key={`${s.topic ?? ''}-${s.step}`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
              isAlert ? 'bg-navi-danger/[0.06]' : 'hover:bg-navi-surface2/40'
            }`}
          >
            {/* 번호 */}
            <span className={`w-5 shrink-0 text-[10px] font-bold text-center ${
              isAlert ? 'text-navi-danger' : 'text-navi-muted'
            }`}>
              {s.step}
            </span>

            {/* 단계명 */}
            <span className={`flex-1 text-[12px] font-medium leading-tight ${
              isAlert ? 'text-navi-danger' : 'text-navi-text'
            }`}>
              {stepName}
            </span>

            {/* 바 */}
            <div className="w-32 shrink-0 h-3.5 bg-navi-surface2 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${
                  isAlert ? 'bg-navi-danger/60' : 'bg-navi-action/60'
                }`}
                style={{ width: `${absRate}%` }}
              />
            </div>

            {/* 도달률 */}
            <span className={`w-12 shrink-0 text-right text-[12px] font-bold ${
              isAlert ? 'text-navi-danger' : 'text-navi-text'
            }`}>
              {absRate}%
            </span>

            {/* 인원 */}
            <span className="w-14 shrink-0 text-right text-[11px] text-navi-secondary">
              {s.users.toLocaleString()}명
            </span>

            {/* 이전 단계 대비 이탈 */}
            <span className={`w-14 shrink-0 text-right text-[11px] font-semibold ${
              isAlert ? 'text-navi-danger' : dropPct > 0 ? 'text-navi-muted' : 'text-navi-muted'
            }`}>
              {i === 0 ? '–' : `↓${dropPct}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
