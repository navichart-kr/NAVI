'use client'

import Link from 'next/link'
import { useLearnStore } from '@/stores/learnStore'

const STEPS = [
  { key: 'moving-average', label: 'MA',       abbr: 'MA',   desc: '추세 읽기',   type: 'indicator' as const },
  { key: 'bollinger',      label: 'BB',        abbr: 'BB',   desc: '변동성',      type: 'indicator' as const },
  { key: 'rsi',            label: 'RSI',       abbr: 'RSI',  desc: '과열 신호',   type: 'indicator' as const },
  { key: 'macd',           label: 'MACD',      abbr: 'MACD', desc: '추세 전환',   type: 'indicator' as const },
  { key: 'drawing',        label: '작도',       abbr: '↗',   desc: '직접 분석',   type: 'drawing'   as const },
  { key: 'simulate',       label: '실전 챌린지', abbr: '▶',   desc: '실전 예측',   type: 'simulate'  as const },
]

export function LearningPath() {
  const { triedIndicators, triedDrawing, simCount } = useLearnStore()

  function isDone(key: string) {
    if (key === 'drawing')   return triedDrawing
    if (key === 'simulate')  return simCount > 0
    return triedIndicators.includes(key)
  }

  const currentIdx = STEPS.findIndex(s => !isDone(s.key))
  const allDone    = currentIdx === -1

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-bold text-navi-muted">학습 경로</span>
        {allDone ? (
          /* 완료 배지 = success surface */
          <span className="text-[11px] bg-navi-success/[0.08] text-navi-text px-2 py-0.5 rounded-full border border-navi-success/25">
            모두 완료
          </span>
        ) : (
          <span className="text-[11px] text-navi-muted">
            {STEPS.filter(s => isDone(s.key)).length}/{STEPS.length} 완료
          </span>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STEPS.map((step, idx) => {
          const done    = isDone(step.key)
          const current = idx === currentIdx

          const inner = (
            <div
              key={step.key}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium whitespace-nowrap transition-all shrink-0',
                done
                  /* 완료 = success surface + border, 흰 텍스트 */
                  ? 'bg-navi-success/[0.07] border-navi-success/22 text-navi-text'
                  : current
                  /* 현재 = action surface + border, 흰 텍스트 */
                  ? 'bg-navi-action/[0.10] border-navi-action/28 text-navi-text'
                  : 'bg-navi-surface border-navi-border text-navi-muted opacity-50',
              ].join(' ')}
            >
              <span className="text-[11px] font-bold">{step.abbr}</span>
              <span>{step.label}</span>
              {done    && <span className="text-navi-text">✓</span>}
              {current && <span className="w-1.5 h-1.5 rounded-full bg-navi-action animate-pulse" />}
            </div>
          )

          // 시뮬레이션은 링크로, 나머지는 그냥 표시
          if (step.type === 'simulate') {
            return (
              <Link key={step.key} href="/simulate">
                {inner}
              </Link>
            )
          }
          return inner
        })}
      </div>

      {/* 현재 단계 안내 */}
      {!allDone && currentIdx !== -1 && (
        <p className="text-[11px] text-navi-muted mt-1.5">
          다음 →{' '}
          <span className="text-navi-text font-medium">
            {STEPS[currentIdx].desc}
          </span>
          {STEPS[currentIdx].type === 'indicator'
            ? ` — 아래 "${STEPS[currentIdx].label}" 버튼을 눌러보세요`
            : STEPS[currentIdx].type === 'drawing'
            ? ' — 작도 도구로 차트에 직접 그어보세요'
            : ' — 예측 시뮬레이션에 도전해보세요'}
        </p>
      )}
    </div>
  )
}
