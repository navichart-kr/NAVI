/**
 * learningStore.ts — 캔들 패턴 학습 & 거래량 학습 세션 상태 관리
 *
 * 흐름:
 *   idle → candle-select or volume-select  (버튼 클릭)
 *   candle-select → candle-active          (패턴 선택)
 *   volume-select → volume-active          (주제 선택)
 *   *-active: stepIndex 진행 → predictionDone → showResult → idle
 */

import { create } from 'zustand'
import { useChartStore } from '@/stores/chartStore'
import { trackEvent }    from '@/lib/analytics'
import type { PatternLocation } from '@/lib/patternDetector'
import type { PatternType, VolumeTopicType } from '@/lib/patternDetector'

export type LearningMode =
  | 'idle'
  | 'candle-select'
  | 'candle-active'
  | 'volume-select'
  | 'volume-active'

export type { PatternType, VolumeTopicType }

/* ─── 레슨 콘텐츠 정의 ──────────────────────────── */

export interface LessonStep {
  text: string       // 메인 설명 텍스트
  subtext?: string   // 보조 텍스트 (작은 글씨)
  isPrediction?: boolean  // 이 단계에서 예측 선택
}

export const CANDLE_LESSONS: Record<PatternType, {
  name: string
  emoji: string
  desc: string
  steps: LessonStep[]
}> = {
  doji: {
    name: '도지',
    emoji: '⚖️',
    desc: '매수·매도 세력이 팽팽하게 맞선 순간',
    steps: [
      {
        text:    '이 캔들은 도지(Doji)입니다.',
        subtext: '시가와 종가가 거의 같아 몸통이 없거나 아주 작아요.',
      },
      {
        text:    '위아래로 꼬리가 나 있어요.',
        subtext: '매수자와 매도자가 치열하게 싸웠지만, 결국 비긴 거예요.',
      },
      {
        text:    '도지는 시장이 결정을 못 한 상태예요.',
        subtext: '다음 방향을 예측하기 어렵고, 중요한 구간에서는 반전 신호가 되기도 해요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 될까요?',
        isPrediction: true,
      },
    ],
  },
  hammer: {
    name: '망치형',
    emoji: '🔨',
    desc: '하락 끝에서 나타나는 반전 신호',
    steps: [
      {
        text:    '이 캔들은 망치형(Hammer)입니다.',
        subtext: '아래 꼬리가 길고, 몸통은 위쪽에 작게 있어요.',
      },
      {
        text:    '주가가 많이 내렸지만, 매수자들이 강하게 반발했어요.',
        subtext: '아래 꼬리의 길이가 매도 압력을 이겨낸 매수 힘을 보여줘요.',
      },
      {
        text:    '하락 구간 끝에 나타나면 반전 신호일 수 있어요.',
        subtext: '아래 꼬리가 길수록 반등 가능성이 높다고 봐요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 될까요?',
        isPrediction: true,
      },
    ],
  },
  'inverted-hammer': {
    name: '역망치형',
    emoji: '🔃',
    desc: '망치를 뒤집은 모양의 반전 후보',
    steps: [
      {
        text:    '이 캔들은 역망치형(Inverted Hammer)입니다.',
        subtext: '위 꼬리가 길고, 몸통은 아래쪽에 작게 있어요.',
      },
      {
        text:    '처음에 매수세가 가격을 높이 끌어올렸지만, 결국 내려왔어요.',
        subtext: '망치형을 뒤집어 놓은 모양이에요.',
      },
      {
        text:    '하락 구간 끝에서 나타나면 주목해야 해요.',
        subtext: '다음 날 강하게 올라오면 상승 전환 신호로 봐요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 될까요?',
        isPrediction: true,
      },
    ],
  },
  'bullish-engulfing': {
    name: '상승 장악형',
    emoji: '📈',
    desc: '음봉을 통째로 삼킨 강한 양봉',
    steps: [
      {
        text:    '이건 상승 장악형(Bullish Engulfing)입니다.',
        subtext: '빨간 캔들 다음 날, 더 큰 초록 캔들이 나온 패턴이에요.',
      },
      {
        text:    '초록 캔들의 몸통이 빨간 캔들의 몸통을 완전히 덮었어요.',
        subtext: '매수자가 매도자를 완전히 압도한 거예요.',
      },
      {
        text:    '전날의 하락을 한방에 뒤집은 강한 신호예요.',
        subtext: '하락 추세 끝에서 나타나면 반전 가능성이 높아져요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 될까요?',
        isPrediction: true,
      },
    ],
  },
  'bearish-engulfing': {
    name: '하락 장악형',
    emoji: '📉',
    desc: '양봉을 통째로 삼킨 강한 음봉',
    steps: [
      {
        text:    '이건 하락 장악형(Bearish Engulfing)입니다.',
        subtext: '초록 캔들 다음 날, 더 큰 빨간 캔들이 나온 패턴이에요.',
      },
      {
        text:    '빨간 캔들의 몸통이 초록 캔들의 몸통을 완전히 덮었어요.',
        subtext: '매도자가 매수자를 완전히 압도한 거예요.',
      },
      {
        text:    '전날의 상승을 한방에 뒤집은 강한 신호예요.',
        subtext: '상승 추세 끝에서 나타나면 하락 전환 가능성이 높아져요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 될까요?',
        isPrediction: true,
      },
    ],
  },
}

export const VOLUME_LESSONS: Record<VolumeTopicType, {
  name: string
  emoji: string
  desc: string
  steps: LessonStep[]
}> = {
  intro: {
    name: '거래량이란?',
    emoji: '📊',
    desc: '거래량의 기본 개념',
    steps: [
      {
        text:    '거래량은 하루에 거래된 주식 수예요.',
        subtext: '막대가 높을수록 그날 더 많은 사람이 사고팔았다는 뜻이에요.',
      },
      {
        text:    '거래량이 갑자기 늘어나면 관심이 집중된 거예요.',
        subtext: '중요한 뉴스나 흐름 변화가 있을 때 거래량이 급증해요.',
      },
      {
        text:    '거래량은 가격 움직임의 "신뢰도"를 보여줘요.',
        subtext: '거래량 없이 오른 가격보다, 거래량 많게 오른 가격이 더 믿음직스러워요.',
      },
      {
        text:    '이 날의 거래량은 어느 정도였을까요?',
        isPrediction: true,
      },
    ],
  },
  'up-surge': {
    name: '상승 + 거래량↑',
    emoji: '🚀',
    desc: '강한 상승의 증거',
    steps: [
      {
        text:    '이 구간은 거래량이 크게 증가했어요.',
        subtext: '많은 사람들이 거래에 참여했다는 의미예요.',
      },
      {
        text:    '가격도 함께 상승하고 있어요.',
        subtext: '거래량 증가 + 가격 상승 = 강한 매수 신호예요.',
      },
      {
        text:    '이런 경우 상승 흐름이 더 이어질 수 있어요.',
        subtext: '많은 사람이 참여해서 올랐으니, 모멘텀이 살아있다는 뜻이에요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 됐을까요?',
        isPrediction: true,
      },
    ],
  },
  'down-surge': {
    name: '하락 + 거래량↑',
    emoji: '💧',
    desc: '강한 매도세의 흔적',
    steps: [
      {
        text:    '이 구간은 거래량이 크게 증가하면서 가격이 하락했어요.',
        subtext: '많은 사람이 동시에 팔았다는 신호예요.',
      },
      {
        text:    '강한 매도 압력이 주가를 아래로 끌어내렸어요.',
        subtext: '이런 하락은 단순 조정보다 더 심각할 수 있어요.',
      },
      {
        text:    '거래량 많은 하락 이후엔 추가 하락이 이어지기도 해요.',
        subtext: '공포에 의한 대량 매도가 또 다른 매도를 부를 수 있거든요.',
      },
      {
        text:    '그렇다면 이후 주가는 어떻게 됐을까요?',
        isPrediction: true,
      },
    ],
  },
  divergence: {
    name: '거래량 다이버전스',
    emoji: '⚡',
    desc: '가격과 거래량이 반대로 움직일 때',
    steps: [
      {
        text:    '가격은 오르고 있지만 거래량은 줄고 있어요.',
        subtext: '이걸 "거래량 다이버전스"라고 해요.',
      },
      {
        text:    '참여자가 줄어들면서 오르고 있다는 뜻이에요.',
        subtext: '사람들의 관심이 식고 있다는 경고 신호일 수 있어요.',
      },
      {
        text:    '거래량이 뒷받침되지 않는 상승은 오래가기 어려워요.',
        subtext: '실제 수요 없이 오른 가격은 쉽게 내려갈 수 있어요.',
      },
      {
        text:    '이후 주가는 어떻게 됐을까요?',
        isPrediction: true,
      },
    ],
  },
  quiz: {
    name: '실전 문제',
    emoji: '🎯',
    desc: '배운 내용을 직접 적용해봐요',
    steps: [
      {
        text:    '이 날의 거래량과 가격 움직임을 보세요.',
        subtext: '지금까지 배운 패턴 중 어떤 것인지 생각해봐요.',
      },
      {
        text:    '거래량 막대와 캔들의 방향을 함께 확인해요.',
        subtext: '거래량이 평균보다 높은지 낮은지, 가격은 올랐는지 내렸는지요.',
      },
      {
        text:    '자, 이후 주가는 어떻게 됐을까요? 예측해보세요.',
        isPrediction: true,
      },
    ],
  },
}

/* ─── Store 타입 ─────────────────────────────────── */

interface LearningState {
  mode:               LearningMode
  patternType:        PatternType | null
  volumeTopic:        VolumeTopicType | null
  patternLocation:    PatternLocation | null
  stepIndex:          number
  prediction:         'up' | 'down' | 'sideways' | null
  showResult:         boolean

  // actions
  openCandleSelect:   () => void
  openVolumeSelect:   () => void
  startCandleLesson:  (type: PatternType, loc: PatternLocation) => void
  startVolumeLesson:  (type: VolumeTopicType, loc: PatternLocation) => void
  nextStep:           () => void
  prevStep:           () => void
  submitPrediction:   (choice: 'up' | 'down' | 'sideways') => void
  revealResult:       () => void
  close:              () => void
}

/* ─── Store 구현 ─────────────────────────────────── */

export const useLearningStore = create<LearningState>((set, get) => ({
  mode:            'idle',
  patternType:     null,
  volumeTopic:     null,
  patternLocation: null,
  stepIndex:       0,
  prediction:      null,
  showResult:      false,

  openCandleSelect: () => set({
    mode: 'candle-select',
    patternType: null, volumeTopic: null,
    patternLocation: null, stepIndex: 0,
    prediction: null, showResult: false,
  }),

  openVolumeSelect: () => set({
    mode: 'volume-select',
    patternType: null, volumeTopic: null,
    patternLocation: null, stepIndex: 0,
    prediction: null, showResult: false,
  }),

  startCandleLesson: (type, loc) => {
    trackEvent('candle_learning_started', { pattern_type: type })

    // 차트 줌 + 마커 설정
    useChartStore.getState().setLearningHighlight({
      candleIndex:      loc.candleIndex,
      prevCandleIndex:  loc.prevCandleIndex,
      windowFrom:       loc.windowFrom,
      windowTo:         loc.windowTo,
      outcome:          loc.outcome,
      showResult:       false,
      type:             'candle',
    })

    set({
      mode:            'candle-active',
      patternType:     type,
      volumeTopic:     null,
      patternLocation: loc,
      stepIndex:       0,
      prediction:      null,
      showResult:      false,
    })
  },

  startVolumeLesson: (type, loc) => {
    trackEvent('volume_learning_started', { topic: type })

    useChartStore.getState().setLearningHighlight({
      candleIndex:  loc.candleIndex,
      windowFrom:   loc.windowFrom,
      windowTo:     loc.windowTo,
      outcome:      loc.outcome,
      showResult:   false,
      type:         'volume',
    })

    set({
      mode:            'volume-active',
      patternType:     null,
      volumeTopic:     type,
      patternLocation: loc,
      stepIndex:       0,
      prediction:      null,
      showResult:      false,
    })
  },

  nextStep: () => {
    const { mode, patternType, volumeTopic, stepIndex, patternLocation } = get()
    const lesson = mode === 'candle-active' && patternType
      ? CANDLE_LESSONS[patternType]
      : mode === 'volume-active' && volumeTopic
      ? VOLUME_LESSONS[volumeTopic]
      : null

    if (!lesson) return
    const newIdx = stepIndex + 1

    if (newIdx < lesson.steps.length) {
      // 단계 진입 이벤트
      if (mode === 'candle-active' && patternType) {
        trackEvent('candle_pattern_viewed', { pattern_type: patternType, step: newIdx + 1 })
      } else if (mode === 'volume-active' && volumeTopic) {
        trackEvent('volume_learning_step_viewed', { topic: volumeTopic, step: newIdx + 1 })
      }
      set({ stepIndex: newIdx })
    }
    // 마지막 단계에서 next → close (결과 확인 후)
    else if (get().showResult) {
      get().close()
    }
  },

  prevStep: () => {
    const { stepIndex } = get()
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1, prediction: null, showResult: false })
  },

  submitPrediction: (choice) => {
    const { mode, patternType, volumeTopic, patternLocation } = get()
    const outcome  = patternLocation?.outcome ?? null
    const isCorrect = outcome ? choice === outcome : null

    if (mode === 'candle-active' && patternType) {
      trackEvent('candle_prediction_answered', {
        pattern_type: patternType,
        chosen:       choice,
        is_correct:   isCorrect,
      })
    } else if (mode === 'volume-active' && volumeTopic) {
      trackEvent('volume_prediction_answered', {
        topic:      volumeTopic,
        chosen:     choice,
        is_correct: isCorrect,
      })
    }
    set({ prediction: choice })
  },

  revealResult: () => {
    const { mode, patternType, volumeTopic, patternLocation } = get()

    // 완료 이벤트
    if (mode === 'candle-active' && patternType) {
      trackEvent('candle_learning_completed', { pattern_type: patternType })
    } else if (mode === 'volume-active' && volumeTopic) {
      trackEvent('volume_learning_completed', { topic: volumeTopic })
    }

    // 차트에 결과 마커 표시
    const current = useChartStore.getState().learningHighlight
    if (current && patternLocation) {
      useChartStore.getState().setLearningHighlight({
        ...current,
        showResult: true,
      })
    }
    set({ showResult: true })
  },

  close: () => {
    // 차트 마커·줌 초기화
    useChartStore.getState().setLearningHighlight(null)
    set({
      mode:            'idle',
      patternType:     null,
      volumeTopic:     null,
      patternLocation: null,
      stepIndex:       0,
      prediction:      null,
      showResult:      false,
    })
  },
}))
