'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ToolTooltip } from './ToolTooltip'
import { useChartStore } from '@/stores/chartStore'
import { indicators } from '@/data/indicators'
import { trackEvent } from '@/lib/analytics'
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
  const { activeIndicators, toggleIndicator, showVolume, toggleVolume } = useChartStore()
  const [hovered, setHovered] = useState<IndicatorSlug | null>(null)

  return (
    /* 모바일: 2열 그리드 (거래량 포함 5개) / PC: flex-wrap */
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
              onClick={() => {
                if (!isActive) trackEvent('indicator_enabled', { indicator: SHORT_LABELS[slug] ?? slug })
                toggleIndicator(slug)
              }}
              className={clsx(
                'w-full sm:w-auto h-10 sm:h-8 px-3.5 rounded-lg text-[13px] sm:text-[12px] font-semibold tracking-wide',
                'transition-all duration-200',
                isActive
                  ? 'bg-navi-action text-white border border-navi-action shadow-[0_0_14px_rgba(91,127,255,0.38)]'
                  : 'bg-navi-surface2 text-navi-secondary border border-navi-border hover:border-navi-action/35 hover:text-navi-text hover:bg-navi-surface3'
              )}
            >
              {SHORT_LABELS[slug]}
            </button>
            <div className="hidden sm:block">
              <ToolTooltip indicator={indicator} visible={hovered === slug} />
            </div>
          </div>
        )
      })}

      {/* 거래량 토글 버튼 */}
      <button
        id="btn-volume"
        onClick={() => {
          if (!showVolume) trackEvent('indicator_enabled', { indicator: '거래량' })
          toggleVolume()
        }}
        className={clsx(
          'w-full sm:w-auto h-10 sm:h-8 px-3.5 rounded-lg text-[13px] sm:text-[12px] font-semibold tracking-wide',
          'transition-all duration-200',
          showVolume
            ? 'bg-navi-action text-white border border-navi-action shadow-[0_0_14px_rgba(91,127,255,0.38)]'
            : 'bg-navi-surface2 text-navi-secondary border border-navi-border hover:border-navi-action/35 hover:text-navi-text hover:bg-navi-surface3'
        )}
      >
        거래량
      </button>
    </div>
  )
}
