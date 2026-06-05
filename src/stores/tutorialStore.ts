import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tutorialSteps }      from '@/data/tutorialSteps'
import { fibonacciSteps }     from '@/data/lessonSteps/fibonacci'
import { rsiAdvancedSteps }   from '@/data/lessonSteps/rsiAdvanced'
import { macdAdvancedSteps }  from '@/data/lessonSteps/macdAdvanced'
import { useChartStore }      from '@/stores/chartStore'
import { trackEvent, getDeviceType } from '@/lib/analytics'
import type { TutorialStep, CandleData } from '@/types'

/** 레슨 키 → 짧은 타입 이름 */
const LESSON_TYPE: Record<string, string> = {
  'fibonacci-advanced': 'fibonacci',
  'rsi-advanced':       'rsi',
  'macd-advanced':      'macd',
  'candle-learning':    'candlestick',
  'volume-learning':    'volume',
}

const LESSON_MAP: Record<string, TutorialStep[]> = {
  'fibonacci-advanced': fibonacciSteps,
  'rsi-advanced':       rsiAdvancedSteps,
  'macd-advanced':      macdAdvancedSteps,
}

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

  // ── 레슨 모드 ────────────────────────────────────────
  /** true이면 레슨 실행 중 (기초 과정 아님) — 마지막 단계에서 완료 화면 없이 종료 */
  isLesson: boolean
  /** 현재 실행 중인 레슨 키 ('fibonacci-advanced' | 'rsi-advanced' | 'macd-advanced' | null) */
  currentLessonKey: string | null

  // ── 액션 ──────────────────────────────────────────────
  start:       () => void
  next:        () => void
  prev:        () => void
  skip:        () => void
  reset:       () => void
  complete:    () => void
  dismissCompletion: () => void
  /** 레슨 시작 — key에 해당하는 단계셋을 로드 */
  startLesson: (key: string) => void
  /** 동적으로 생성된 TutorialStep[]를 레슨으로 시작 (캔들·거래량 학습 전용) */
  startDynamicLesson: (steps: TutorialStep[], key: string) => void
  /** 심화 레슨 정상 완료 — 모든 지표·작도 초기화 후 닫기 */
  completeLesson: () => void

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
      isLesson:             false,
      currentLessonKey:     null,
      steps:                tutorialSteps,
      currentStep:          null,
      ...INITIAL_ACTION_STATE,

      start: () => {
        // 튜토리얼 시작 시 활성 지표 전부 초기화, 완료 화면도 닫기
        const { hasCompletedOnce } = get()
        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))

        trackEvent('tutorial_started', {
          has_completed_before: hasCompletedOnce,
          total_steps:          tutorialSteps.length,
          device_type:          getDeviceType(),
        })

        set({
          isActive:             true,
          currentIndex:         0,
          currentStep:          tutorialSteps[0],
          steps:                tutorialSteps,
          showCompletionScreen: false,
          isLesson:             false,
          currentLessonKey:     null,
          ...INITIAL_ACTION_STATE,
        })
      },

      next: () => {
        const { currentIndex, steps, isLesson, currentLessonKey } = get()
        const nextIndex = currentIndex + 1

        // 단계 완료 이벤트 — 현재 단계(currentIndex)가 완료됨
        const stepNumber = currentIndex + 1
        if (isLesson && currentLessonKey) {
          const lessonType = LESSON_TYPE[currentLessonKey]
          if (lessonType) {
            trackEvent('tutorial_step_completed', { step_number: stepNumber, lesson_type: lessonType })
          }
        } else {
          trackEvent('tutorial_step_completed', { step_number: stepNumber, tutorial_type: 'basic' })
        }

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

        // 다음 단계 진입 전: 드로잉 툴 항상 초기화 후 필요 시 활성화
        useChartStore.getState().setDrawingTool('none')
        if (nextStep.activateDrawingToolOnEnter) {
          useChartStore.getState().setDrawingTool(nextStep.activateDrawingToolOnEnter)
        }

        // 다음 단계 진입 전: learningHighlightOnEnter 처리
        if (nextStep.learningHighlightOnEnter !== undefined) {
          useChartStore.getState().setLearningHighlight(nextStep.learningHighlightOnEnter)
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

        // 이전 단계 진입 전: learningHighlightOnEnter 처리
        if (prevStep.learningHighlightOnEnter !== undefined) {
          useChartStore.getState().setLearningHighlight(prevStep.learningHighlightOnEnter)
        }

        // 이전 단계 진입 전: 드로잉 툴 항상 초기화 후 필요 시 활성화
        useChartStore.getState().setDrawingTool('none')
        if (prevStep.activateDrawingToolOnEnter) {
          useChartStore.getState().setDrawingTool(prevStep.activateDrawingToolOnEnter)
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

      skip: () => {
        const { isLesson, currentLessonKey, currentIndex } = get()
        if (isLesson) {
          // 레슨 이탈
          const lessonType = currentLessonKey ? LESSON_TYPE[currentLessonKey] : undefined
          trackEvent('tutorial_exit', {
            tutorial_type: lessonType ?? 'lesson',
            step_number:   currentIndex + 1,
          })
          // 레슨 건너뛰기: 기초 과정 완료 처리 안 함 + 지표·작도·드로잉툴·학습하이라이트 초기화
          const { activeIndicators, toggleIndicator } = useChartStore.getState()
          activeIndicators.forEach(slug => toggleIndicator(slug))
          useChartStore.getState().requestClearDrawings()
          useChartStore.getState().setDrawingTool('none')
          useChartStore.getState().setLearningHighlight(null)
          set({ isActive: false, currentStep: null, showCompletionScreen: false, isLesson: false, currentLessonKey: null, steps: tutorialSteps, ...INITIAL_ACTION_STATE })
        } else {
          trackEvent('tutorial_exit', { tutorial_type: 'basic', step_number: currentIndex + 1 })
          set({ isActive: false, hasCompletedOnce: true, currentStep: null, showCompletionScreen: false, isLesson: false, currentLessonKey: null, ...INITIAL_ACTION_STATE })
        }
      },

      reset: () =>
        set({ isActive: false, currentIndex: 0, currentStep: null, showCompletionScreen: false, isLesson: false, ...INITIAL_ACTION_STATE }),

      /** 기초 과정 마지막 단계 완료 — 완료 화면 표시 */
      complete: () => {
        const { currentIndex, steps } = get()
        trackEvent('tutorial_step_completed', { step_number: currentIndex + 1, tutorial_type: 'basic' })
        trackEvent('tutorial_completed', {
          total_steps:  steps.length,
          device_type:  getDeviceType(),
        })
        set({
          isActive:             false,
          hasCompletedOnce:     true,
          currentStep:          null,
          showCompletionScreen: true,
          isLesson:             false,
          currentLessonKey:     null,
          steps:                tutorialSteps,
          ...INITIAL_ACTION_STATE,
        })
      },

      dismissCompletion: () => set({ showCompletionScreen: false }),

      /** 심화 레슨 시작 (key: 'fibonacci-advanced' | 'rsi-advanced' | 'macd-advanced') */
      startLesson: (key: string) => {
        const lessonSteps = LESSON_MAP[key]
        if (!lessonSteps?.length) return
        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))

        // 레슨 시작 이벤트
        const lessonType = LESSON_TYPE[key]
        if (lessonType) {
          trackEvent(`advanced_${lessonType}_started`, {
            lesson_type:  lessonType,
            total_steps:  lessonSteps.length,
            device_type:  getDeviceType(),
          })
        }

        // 기존 작도·하이라이트·드로잉 툴 초기화
        useChartStore.getState().requestClearDrawings()
        useChartStore.getState().setDrawingTool('none')
        useChartStore.getState().setLearningHighlight(null)

        set({
          isActive:             true,
          currentIndex:         0,
          currentStep:          lessonSteps[0],
          steps:                lessonSteps,
          isLesson:             true,
          currentLessonKey:     key,
          showCompletionScreen: false,
          ...INITIAL_ACTION_STATE,
        })
      },

      /** 동적으로 생성된 TutorialStep[]를 레슨으로 시작 (캔들·거래량 학습 전용) */
      startDynamicLesson: (lessonSteps: TutorialStep[], key: string) => {
        if (!lessonSteps.length) return
        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))

        // 분석 이벤트
        const lessonType = LESSON_TYPE[key] ?? key
        trackEvent(`${lessonType}_tutorial_started`, {
          lesson_key:   key,
          total_steps:  lessonSteps.length,
          device_type:  getDeviceType(),
        })

        // 첫 단계의 학습 하이라이트 적용
        const first = lessonSteps[0]
        if (first.learningHighlightOnEnter !== undefined) {
          useChartStore.getState().setLearningHighlight(first.learningHighlightOnEnter)
        }

        set({
          isActive:             true,
          currentIndex:         0,
          currentStep:          first,
          steps:                lessonSteps,
          isLesson:             true,
          currentLessonKey:     key,
          showCompletionScreen: false,
          ...INITIAL_ACTION_STATE,
        })
      },

      /** 심화 레슨 정상 완료 — 모든 지표·작도 초기화 후 닫기 */
      completeLesson: () => {
        const { currentLessonKey, currentIndex } = get()
        const lessonType = currentLessonKey ? LESSON_TYPE[currentLessonKey] : undefined

        // 레슨 완료 이벤트
        if (lessonType) {
          const { steps } = get()
          trackEvent('tutorial_step_completed', { step_number: currentIndex + 1, lesson_type: lessonType })
          // 캔들·거래량 학습은 전용 이벤트 이름 사용
          if (currentLessonKey === 'candle-learning') {
            trackEvent('candlestick_tutorial_completed', { total_steps: steps.length, device_type: getDeviceType() })
          } else if (currentLessonKey === 'volume-learning') {
            trackEvent('volume_tutorial_completed', { total_steps: steps.length, device_type: getDeviceType() })
          } else {
            trackEvent(`advanced_${lessonType}_completed`, {
              lesson_type:  lessonType,
              total_steps:  steps.length,
              device_type:  getDeviceType(),
            })
          }
        }

        const { activeIndicators, toggleIndicator } = useChartStore.getState()
        activeIndicators.forEach(slug => toggleIndicator(slug))
        useChartStore.getState().requestClearDrawings()
        useChartStore.getState().setDrawingTool('none')
        useChartStore.getState().setLearningHighlight(null)
        set({
          isActive:             false,
          currentStep:          null,
          showCompletionScreen: false,
          isLesson:             false,
          currentLessonKey:     null,
          steps:                tutorialSteps,
          ...INITIAL_ACTION_STATE,
        })
      },

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
