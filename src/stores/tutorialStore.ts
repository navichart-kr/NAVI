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
  stepDone:         boolean
  candleData:       CandleData | null
  chosenJudgment:   string | null

  // ── 차트 포커스 ──────────────────────────────────────
  focusBarsFromEnd: number | null

  // ── 완료 화면 ────────────────────────────────────────
  showCompletionScreen: boolean

  // ── 액션 ──────────────────────────────────────────────
  start:             () => void
  next:              () => void
  prev:              () => void
  skip:              () => void
  reset:             () => void
  complete:          () => void
  dismissCompletion: () => void

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

/** 현재 활성 지표 중 slugs에 포함된 것들을 끈다 */
function clearIndicators(slugs: string[]) {
  const { activeIndicators, toggleIndicator } = useChartStore.getState()
  slugs.forEach(slug => {
    if (activeIndicators.has(slug as any)) toggleIndicator(slug as any)
  })
}

/** slugs에 포함된 지표 중 꺼져있는 것들을 켠다 */
function activateIndicators(slugs: string[]) {
  const { activeIndicators, toggleIndicator } = useChartStore.getState()
  slugs.forEach(slug => {
    if (!activeIndicators.has(slug as any)) toggleIndicator(slug as any)
  })
}

/** 모든 작도(추세선·피보나치)를 지운다 */
function clearDrawings() {
  useChartStore.getState().requestClearDrawings()
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive:             false,
      currentIndex:         0,
      hasCompletedOnce:     false,
      showCompletionScreen: false,
      steps:                tutorialSteps,
      currentStep:          null,
      ...INITIAL_ACTION_STATE,

      start: () => {
        // 튜토리얼 시작 시 활성 지표 전부 초기화, 완료 화면도 닫기
        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))

        set({
          isActive:             true,
          currentIndex:         0,
          currentStep:          tutorialSteps[0],
          showCompletionScreen: false,
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
        // 다음 단계 진입 전: activateIndicatorsOnEnter 처리
        if (nextStep.activateIndicatorsOnEnter?.length) {
          activateIndicators(nextStep.activateIndicatorsOnEnter)
        }

        // 다음 단계 진입 전: clearDrawingsOnEnter 처리
        if (nextStep.clearDrawingsOnEnter) {
          clearDrawings()
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
        const { currentIndex, steps, currentStep } = get()
        if (currentIndex === 0) return
        const prevIndex = currentIndex - 1
        const prevStep  = steps[prevIndex]

        // ── 현재 단계 진입 시 적용된 지표 변경 되돌리기 ──────────────
        // clearIndicatorsOnEnter 로 껐던 지표 → 다시 켬 (판단 단계로 돌아갈 때 지표 복원)
        if (currentStep?.clearIndicatorsOnEnter?.length) {
          activateIndicators(currentStep.clearIndicatorsOnEnter)
        }
        // activateIndicatorsOnEnter 로 켰던 지표 → 다시 끔 (종합테스트 전 단계로 돌아갈 때)
        if (currentStep?.activateIndicatorsOnEnter?.length) {
          clearIndicators(currentStep.activateIndicatorsOnEnter)
        }
        // 현재 단계에서 사용자가 직접 켠 지표 → 끔 (toggle 단계 재시작)
        if (currentStep?.indicatorKey) {
          const { activeIndicators: ai, toggleIndicator: ti } = useChartStore.getState()
          if (ai.has(currentStep.indicatorKey as any)) ti(currentStep.indicatorKey as any)
        }

        // ── 돌아가는 단계가 indicator-toggle 이면 해당 지표도 끔 ──────
        // (이전 단계에서 켰던 지표가 아직 살아있을 수 있음)
        if (prevStep?.indicatorKey) {
          const { activeIndicators: ai, toggleIndicator: ti } = useChartStore.getState()
          if (ai.has(prevStep.indicatorKey as any)) ti(prevStep.indicatorKey as any)
        }

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
        set({ isActive: false, hasCompletedOnce: true, currentStep: null, showCompletionScreen: false, ...INITIAL_ACTION_STATE }),

      reset: () =>
        set({ isActive: false, currentIndex: 0, currentStep: null, showCompletionScreen: false, ...INITIAL_ACTION_STATE }),

      /** 마지막 단계 완료 — 완료 화면으로 전환 */
      complete: () =>
        set({
          isActive:             false,
          hasCompletedOnce:     true,
          currentStep:          null,
          showCompletionScreen: true,
          ...INITIAL_ACTION_STATE,
        }),

      dismissCompletion: () => set({ showCompletionScreen: false }),

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
