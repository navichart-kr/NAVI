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

/**
 * 학습용 데이터 기준 날짜 — 2010년 이후 데이터만 패턴 탐색에 사용
 * "전체" 기간 선택 시 1980~90년대 분할조정 가격($0.1 수준)이 포함되므로
 * 현대 차트와 맥락이 다른 패턴이 선택되는 문제를 방지한다.
 * 필터 후 200봉 미만이면 원본 데이터로 폴백.
 */
const LEARN_CUT_DATE = '2010-01-01'
const MIN_CANDLES    = 200

function recentLearningData(candleData: ReturnType<typeof useChartStore.getState>['candleData']) {
  const filtered = candleData.filter(c => c.time >= LEARN_CUT_DATE)
  return filtered.length >= MIN_CANDLES ? filtered : candleData
}

/** 캔들 패턴 학습 시작 */
export function openCandleSelect() {
  const candleData = useChartStore.getState().candleData
  const steps = buildCandleLearningSteps(recentLearningData(candleData))
  if (!steps.length) {
    console.warn('[CandleLearning] 패턴을 데이터에서 찾지 못했어요.')
    return
  }
  useTutorialStore.getState().startDynamicLesson(steps, 'candle-learning')
}

/** 거래량 학습 시작 */
export function openVolumeSelect() {
  const candleData = useChartStore.getState().candleData
  const steps = buildVolumeLearningSteps(recentLearningData(candleData))
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
