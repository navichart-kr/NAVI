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
    <div id="drawing-toolbar" className="space-y-2 sm:space-y-3">

      {/* ── 도구 버튼 ─────────────────────────────────────────
          모바일: 2열 그리드 (추세선|피보나치 / 지우기 전체폭)
          PC   : 기존 flex-wrap 행
      ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        {TOOLS.map((tool) => {
          const active = drawingTool === tool.value
          return (
            <div key={tool.value} className="relative group">
              <button
                onClick={() => setDrawingTool(active ? 'none' : tool.value)}
                className={clsx(
                  'flex items-center justify-center gap-2 w-full sm:w-auto',
                  'px-3 h-10 sm:h-auto sm:py-2 rounded-xl text-xs font-semibold',
                  'border transition-all duration-200',
                  active
                    ? 'bg-amber-500/12 border-amber-500/40 text-navi-text shadow-md shadow-amber-500/10 scale-[1.02]'
                    : 'bg-navi-surface border-navi-border text-navi-muted hover:border-navi-border2 hover:text-navi-text'
                )}
              >
                {/* 아이콘: PC에서만 표시 */}
                <span className={clsx('text-sm leading-none hidden sm:inline', active && 'animate-pulse')}>
                  {tool.icon}
                </span>
                {tool.label}
                {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />}
              </button>

              {/* 호버 툴팁 — PC 전용 */}
              {!active && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                                bg-navi-surface2 border border-navi-border2 text-navi-secondary text-[11px] rounded-xl
                                whitespace-nowrap opacity-0 group-hover:opacity-100
                                pointer-events-none transition-opacity z-50 hidden sm:block">
                  {tool.desc}
                  <div className="absolute top-full left-1/2 -translate-x-1/2
                                  border-4 border-transparent border-t-navi-border2" />
                </div>
              )}
            </div>
          )
        })}

        {/* 지우기 — 모바일: 2열 전체 폭 / PC: 일반 너비 */}
        <button
          onClick={() => setDrawingTool('erase')}
          className="col-span-2 flex items-center justify-center gap-1.5 px-3 h-10 sm:h-auto sm:py-2 rounded-xl text-xs
                     border border-navi-border text-navi-muted
                     hover:border-navi-border2 hover:text-navi-text transition-all
                     w-full sm:w-auto"
        >
          <span className="hidden sm:inline">✕</span>
          지우기
        </button>
      </div>

      {/* ── 활성 도구 안내 패널 ─────────────────────────────── */}
      {isDrawing && (
        <div className="rounded-xl border border-amber-500/28 bg-amber-500/[0.06] overflow-hidden">

          {/* 모바일: 컴팩트 1행 안내 */}
          <div className="sm:hidden flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-1 shrink-0">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-full transition-all duration-300',
                    i === drawingStep
                      ? 'w-4 h-2 bg-amber-400/70'
                      : i < drawingStep
                      ? 'w-2 h-2 bg-amber-500/50'
                      : 'w-2 h-2 bg-navi-border'
                  )}
                />
              ))}
            </div>
            <p className="text-[11px] text-navi-text font-medium leading-snug flex-1">{stepGuide}</p>
            <button
              onClick={() => setDrawingTool('none')}
              className="text-[10px] text-navi-muted hover:text-navi-text shrink-0 transition-colors"
            >
              취소
            </button>
          </div>

          {/* PC: 기존 풀 안내 패널 */}
          <div className="hidden sm:block">
            {drawingStep === 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/[0.08] border-b border-amber-500/20">
                <p className="text-[12px] font-semibold text-navi-text">위 차트에서 직접 클릭하세요</p>
                <button
                  onClick={() => setDrawingTool('none')}
                  className="ml-auto text-[11px] text-navi-muted hover:text-navi-text transition-colors"
                >
                  취소
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 shrink-0">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className={clsx(
                      'rounded-full transition-all duration-300',
                      i === drawingStep
                        ? 'w-5 h-2.5 bg-amber-400/70'
                        : i < drawingStep
                        ? 'w-2.5 h-2.5 bg-amber-500/50'
                        : 'w-2.5 h-2.5 bg-navi-border'
                    )}
                  />
                ))}
              </div>
              <p className="text-[12px] text-navi-text font-medium">{stepGuide}</p>
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

        </div>
      )}
    </div>
  )
}
