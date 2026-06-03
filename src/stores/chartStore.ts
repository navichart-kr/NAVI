import { create } from 'zustand'
import type { IndicatorSlug, CandleData, LearningHighlight } from '@/types'
import type { Period } from '@/data/mockCandles'

export type TimeUnit    = 'daily' | 'weekly' | 'monthly'
export type DrawingTool = 'none' | 'trendline' | 'fibonacci' | 'erase'

interface ChartState {
  // 차트 데이터
  candleData:    CandleData[]
  isLoading:     boolean
  error:         string | null
  setCandleData: (data: CandleData[]) => void
  setLoading:    (v: boolean) => void
  setError:      (msg: string | null) => void

  // 기간 · 단위
  period:      Period
  timeUnit:    TimeUnit
  setPeriod:   (p: Period) => void
  setTimeUnit: (u: TimeUnit) => void

  // 지표
  activeIndicators:    Set<IndicatorSlug>
  hoveredIndicator:    IndicatorSlug | null
  toggleIndicator:     (slug: IndicatorSlug) => void
  setHoveredIndicator: (slug: IndicatorSlug | null) => void

  // 작도 도구
  drawingTool:    DrawingTool
  drawingStep:    0 | 1       // 0: 시작 전, 1: 첫 번째 점 찍은 후
  setDrawingTool: (t: DrawingTool) => void
  setDrawingStep: (s: 0 | 1) => void

  /**
   * clearDrawingsSignal
   * 이 값이 증가하면 ChartContainer 는 모든 작도(추세선·피보나치)를 지운다.
   * tutorialStore에서 clearDrawingsOnEnter 단계 진입 시 호출한다.
   */
  clearDrawingsSignal:    number
  requestClearDrawings:   () => void

  /**
   * learningHighlight — 캔들/거래량 학습 시 차트 줌 + 캔들 강조
   * tutorialStore 가 learningHighlightOnEnter 단계 진입 시 set/clear 한다.
   */
  learningHighlight: LearningHighlight | null
  setLearningHighlight: (h: LearningHighlight | null) => void
}

export const useChartStore = create<ChartState>((set) => ({
  candleData: [],
  isLoading:  true,
  error:      null,
  setCandleData: (candleData) => set({ candleData }),
  setLoading:    (isLoading)  => set({ isLoading }),
  setError:      (error)      => set({ error }),

  period:      '1Y',
  timeUnit:    'daily',
  setPeriod:   (period)   => set({ period }),
  setTimeUnit: (timeUnit) => set({ timeUnit }),

  activeIndicators: new Set(),
  hoveredIndicator: null,
  toggleIndicator: (slug) =>
    set((state) => {
      const next = new Set(state.activeIndicators)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return { activeIndicators: next }
    }),
  setHoveredIndicator: (hoveredIndicator) => set({ hoveredIndicator }),

  drawingTool:    'none',
  drawingStep:    0,
  setDrawingTool: (drawingTool) => set({ drawingTool, drawingStep: 0 }),
  setDrawingStep: (drawingStep) => set({ drawingStep }),

  clearDrawingsSignal:  0,
  requestClearDrawings: () => set((s) => ({ clearDrawingsSignal: s.clearDrawingsSignal + 1 })),

  learningHighlight:    null,
  setLearningHighlight: (learningHighlight) => set({ learningHighlight }),
}))
