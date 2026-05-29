'use client'

import { useEffect } from 'react'
import { clsx } from 'clsx'
import { useChartStore, type DrawingTool } from '@/stores/chartStore'

const TOOLS: { value: DrawingTool; label: string; icon: string; desc: string }[] = [
  { value: 'trendline', label: '추세선',   icon: '↗', desc: '저점·저점 또는 고점·고점을 이어 방향을 표시해요' },
  { value: 'fibonacci', label: '피보나치', icon: '𝚽', desc: '고점→저점 클릭 시 되돌림 구간이 자동 표시돼요' },
]

const GUIDE: Record<string, [string, string]> = {
  trendline: ['① 차트에서 시작점을 클릭하세요', '② 끝점을 클릭하면 선이 그어져요'],
  fibonacci: ['① 고점(또는 저점)을 클릭하세요',  '② 반대 끝점을 클릭하면 레벨이 표시돼요'],
}

export function DrawingToolbar() {
  const { drawingTool, drawingStep, setDrawingTool } = useChartStore()

  const isDrawing = drawingTool === 'trendline' || drawingTool === 'fibonacci'
  const guide     = isDrawing ? GUIDE[drawingTool] : null
  const stepGuide = guide ? guide[drawingStep] : null

  /* 그리기 도구 활성화 시 차트가 보이도록 스크롤 */
  useEffect(() => {
    if (!isDrawing) return
    const el = document.getElementById('chart-area')
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight * 0.7) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isDrawing])

  return (
    <div id="drawing-toolbar" className="space-y-3">

      {/* 도구 버튼 행 */}
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map((tool) => {
          const active = drawingTool === tool.value
          return (
            <div key={tool.value} className="relative group">
              <button
                onClick={() => setDrawingTool(active ? 'none' : tool.value)}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold',
                  'border transition-all duration-200',
                  active
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md shadow-amber-500/15 scale-[1.02]'
                    : 'bg-navi-surface border-navi-border text-navi-muted hover:border-amber-500/50 hover:text-amber-400'
                )}
              >
                <span className={clsx('text-sm leading-none', active && 'animate-pulse')}>
                  {tool.icon}
                </span>
                {tool.label}
                {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>

              {/* 호버 툴팁 */}
              {!active && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                                bg-gray-900 border border-gray-700 text-white text-[11px] rounded-xl
                                whitespace-nowrap opacity-0 group-hover:opacity-100
                                pointer-events-none transition-opacity z-50">
                  {tool.desc}
                  <div className="absolute top-full left-1/2 -translate-x-1/2
                                  border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          )
        })}

        {/* 지우기 */}
        <button
          onClick={() => setDrawingTool('erase')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs
                     border border-navi-border text-navi-muted
                     hover:border-red-500/50 hover:text-red-400 transition-all"
        >
          <span>✕</span>
          모두 지우기
        </button>
      </div>

      {/* ── 활성 도구 안내 패널 ─────────────────────────────── */}
      {isDrawing && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 overflow-hidden">
          {/* 차트로 이동 안내 배너 */}
          {drawingStep === 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20">
              <span className="text-base">⬆️</span>
              <p className="text-[11px] font-semibold text-amber-300">위 차트에서 직접 클릭하세요</p>
              <button
                onClick={() => setDrawingTool('none')}
                className="ml-auto text-[11px] text-amber-500/70 hover:text-amber-400 transition-colors"
              >
                취소
              </button>
            </div>
          )}

          {/* 단계별 진행 표시 */}
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            {/* 스텝 도트 */}
            <div className="flex items-center gap-1.5 shrink-0">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-full transition-all duration-300',
                    i === drawingStep
                      ? 'w-5 h-2.5 bg-amber-400'
                      : i < drawingStep
                      ? 'w-2.5 h-2.5 bg-amber-600'
                      : 'w-2.5 h-2.5 bg-navi-border'
                  )}
                />
              ))}
            </div>

            <p className="text-[12px] text-amber-300 font-medium">{stepGuide}</p>

            {drawingStep === 1 && (
              <button
                onClick={() => setDrawingTool('none')}
                className="ml-auto text-[11px] text-navi-muted hover:text-navi-text shrink-0 transition-colors"
              >
                취소
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
