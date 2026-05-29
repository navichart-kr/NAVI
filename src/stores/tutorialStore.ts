import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tutorialSteps } from '@/data/tutorialSteps'
import { useChartStore } from '@/stores/chartStore'
import type { TutorialStep, CandleData } from '@/types'

interface TutorialState {
  isActive:         boolean
  currentIndex:     number
  hasCompletedOnce: boolean
  steps:            TutorialStep[]
  currentStep:      TutorialStep | null

  // ── 인터랙티브 상태 ──────────────────────────────────
  stepDone:         boolean                // 현재 단계 행동 완료 여부
  candleData:       CandleData | null      // candle-click 시 클릭된 캔들 데이터
  chosenJudgment:   string | null          // judgment 선택값

  // ── 차트 포커스 ──────────────────────────────────────
  focusBarsFromEnd: number | null          // 단계 진입 시 마지막 N봉 줌

  // ── 액션 ──────────────────────────────────────────────
  start:  () => void
  next:   () => void
  prev:   () => void
  skip:   () => void
  reset:  () => void

  markStepDone:      () => void
  notifyCandleClick: (data: CandleData) => void
  notifyJudgment:    (value: string)    => void
}

const INITIAL_ACTION_STATE = {
  stepDone:         false,
  candleData:       null,
  chosenJudgment:   null,
  focusBarsFromEnd: null,
}

/** 현재 활성 지표 중 slugs에 포함된 것들을 모두 끈다 */
function clearIndicators(slugs: string[]) {
  const { activeIndicators, toggleIndicator } = useChartStore.getState()
  slugs.forEach(slug => {
    if (activeIndicators.has(slug as any)) toggleIndicator(slug as any)
  })
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive:         false,
      currentIndex:     0,
      hasCompletedOnce: false,
      steps:            tutorialSteps,
      currentStep:      null,
      ...INITIAL_ACTION_STATE,

      start: () => {
        // 튜토리얼 시작 시 활성 지표 전부 초기화 — 깨끗한 상태에서 시작
        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))

        set({
          isActive:     true,
          currentIndex: 0,
          currentStep:  tutorialSteps[0],
          ...INITIAL_ACTION_STATE,
        })
      },

      next: () => {
        const { currentIndex, steps } = get()
        const nextIndex = currentIndex + 1

        if (nextIndex >= steps.length) {
          set({ isActive: false, hasCompletedOnce: true, currentStep: null, ...INITIAL_ACTION_STATE })
          return
        }

        const nextStep = steps[nextIndex]

        // 다음 단계 진입 전: clearIndicatorsOnEnter 처리
        if (nextStep.clearIndicatorsOnEnter?.length) {
          clearIndicators(nextStep.clearIndicatorsOnEnter)
        }

        set({
          currentIndex:     nextIndex,
          currentStep:      nextStep,
          focusBarsFromEnd: nextStep.focusBarsFromEnd ?? null,
          stepDone:         false,
          candleData:       null,
          chosenJudgment:   null,
        })
      },

      prev: () => {
        const { currentIndex, steps } = get()
        const prevIndex = Math.max(0, currentIndex - 1)
        const prevStep  = steps[prevIndex]
        set({
          currentIndex:     prevIndex,
          currentStep:      prevStep,
          focusBarsFromEnd: prevStep.focusBarsFromEnd ?? null,
          stepDone:         false,
          candleData:       null,
          chosenJudgment:   null,
        })
      },

      skip: () =>
        set({ isActive: false, hasCompletedOnce: true, currentStep: null, ...INITIAL_ACTION_STATE }),

      reset: () =>
        set({ isActive: false, currentIndex: 0, currentStep: null, ...INITIAL_ACTION_STATE }),

      markStepDone: () => set({ stepDone: true }),

      notifyCandleClick: (data) => {
        const { isActive, currentStep } = get()
        if (isActive && currentStep?.actionRequired === 'candle-click') {
          set({ stepDone: true, candleData: data })
        }
      },

      notifyJudgment: (value) => {
        const { isActive, currentStep } = get()
        if (isActive && currentStep?.actionRequired === 'judgment') {
          set({ stepDone: true, chosenJudgment: value })
        }
      },
    }),
    {
      name: 'navi-tutorial',
      partialize: (state) => ({ hasCompletedOnce: state.hasCompletedOnce }),
    }
  )
)
