'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ToolTooltip } from './ToolTooltip'
import { useChartStore } from '@/stores/chartStore'
import { indicators } from '@/data/indicators'
import type { IndicatorSlug } from '@/types'

const ANALYSIS_TOOLS: IndicatorSlug[] = [
  'moving-average',
  'rsi',
  'macd',
  'bollinger',
]

const SHORT_LABELS: Partial<Record<IndicatorSlug, string>> = {
  'moving-average': 'MA',
  rsi:              'RSI',
  macd:             'MACD',
  bollinger:        'BB',
}

export function IndicatorToolbar() {
  const { activeIndicators, toggleIndicator } = useChartStore()
  const [hovered, setHovered] = useState<IndicatorSlug | null>(null)

  return (
    /* 모바일: 2×2 그리드 / PC: 기존 flex-wrap */
    <div id="indicator-toolbar" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5 sm:items-center">
      {ANALYSIS_TOOLS.map((slug) => {
        const indicator = indicators[slug]
        const isActive  = activeIndicators.has(slug)

        return (
          <div
            key={slug}
            id={`btn-${slug}`}
            className="relative"
            onMouseEnter={() => setHovered(slug)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={() => toggleIndicator(slug)}
              className={clsx(
                /* 모바일: 전체 너비 + 큰 터치 타깃 / PC: 기존 */
                'w-full sm:w-auto h-10 sm:h-8 px-3.5 rounded-lg text-[13px] sm:text-[12px] font-semibold tracking-wide',
                'transition-all duration-200',
                isActive
                  ? 'bg-navi-action text-white border border-navi-action shadow-[0_0_14px_rgba(91,127,255,0.38)]'
                  : 'bg-navi-surface2 text-navi-secondary border border-navi-border hover:border-navi-action/35 hover:text-navi-text hover:bg-navi-surface3'
              )}
            >
              {SHORT_LABELS[slug]}
            </button>
            {/* 툴팁 — PC 전용 (모바일 Hover 없음) */}
            <div className="hidden sm:block">
              <ToolTooltip indicator={indicator} visible={hovered === slug} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
