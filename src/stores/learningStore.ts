/**
 * learningStore.ts — 캔들·거래량 학습 시작 래퍼
 *
 * 이전: 독립 상태 머신 + 바텀시트 UI
 * 현재: tutorialStore.startDynamicLesson()를 통해 기존 튜토리얼 UX와 동일하게 동작
 *
 * chart/page.tsx 에서 useLearningStore()로 openCandleSelect / openVolumeSelect
 * 두 함수만 사용한다.
 */

import { useChartStore }    from '@/stores/chartStore'
import { useTutorialStore } from '@/stores/tutorialStore'
import { buildCandleLearningSteps } from '@/data/lessonSteps/candleLearning'
import { buildVolumeLearningSteps }  from '@/data/lessonSteps/volumeLearning'

/** 캔들 패턴 학습 시작 */
export function openCandleSelect() {
  const candleData = useChartStore.getState().candleData
  const steps = buildCandleLearningSteps(candleData)
  if (!steps.length) {
    console.warn('[CandleLearning] 패턴을 데이터에서 찾지 못했어요.')
    return
  }
  useTutorialStore.getState().startDynamicLesson(steps, 'candle-learning')
}

/** 거래량 학습 시작 */
export function openVolumeSelect() {
  const candleData = useChartStore.getState().candleData
  const steps = buildVolumeLearningSteps(candleData)
  if (!steps.length) {
    console.warn('[VolumeLearning] 거래량 데이터를 찾지 못했어요.')
    return
  }
  useTutorialStore.getState().startDynamicLesson(steps, 'volume-learning')
}

/** 하위 호환용 — 기존 useLearningStore() 호출 코드를 위한 훅 형태 래퍼 */
export function useLearningStore() {
  return {
    openCandleSelect,
    openVolumeSelect,
    /** 현재 거래량 학습 활성 여부 (VolumeChart 표시 조건에 사용) */
    get mode() {
      const key = useTutorialStore.getState().currentLessonKey
      if (key === 'volume-learning' && useTutorialStore.getState().isActive) return 'volume-active'
      if (key === 'candle-learning' && useTutorialStore.getState().isActive) return 'candle-active'
      return 'idle'
    },
  }
}
