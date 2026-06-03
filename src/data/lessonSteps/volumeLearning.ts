/**
 * volumeLearning.ts — 거래량 학습 단계 자동 생성
 *
 * buildVolumeLearningSteps(candleData)
 *   → 5개 주제 × 3~4단계 + 완료 단계 로 구성된 TutorialStep[] 반환
 *
 * 거래량 학습은 캔들 학습과 다르다:
 *   - 결과 공개 단계 없음 (거래량은 미래 방향 직접 예측 지표가 아님)
 *   - 각 주제마다 퀴즈(개념 확인) 포함
 *   - VolumeChart 서브차트에서 특정 바를 amber 색으로 강조
 */

import type { TutorialStep, CandleData, LearningHighlight } from '@/types'
import { findVolumePattern, type VolumeTopicType } from '@/lib/patternDetector'

/* ─── 헬퍼 ────────────────────────────────────────────── */

function makeVolumeHL(
  candleIndex: number,
  windowFrom:  number,
  windowTo:    number,
  highlightIdx: number,
): LearningHighlight {
  return {
    candleIndex,
    windowFrom,
    windowTo,
    outcome:              'sideways',  // 거래량 학습은 outcome 미사용
    showResult:           false,
    type:                 'volume',
    volumeHighlightIndex: highlightIdx,
  }
}

/* ─── 주제별 단계 설명 ─────────────────────────────────── */

interface VolumeTopicDef {
  topicKey:  VolumeTopicType
  title:     string
  steps: Array<{
    stepTitle: string
    stepBody:  string
    useHL:     boolean   // 이 단계에서 해당 구간 하이라이트 사용 여부
  }>
  quiz: {
    question:     string
    correctValue: string
    choices: Array<{ value: string; label: string; feedback: string }>
  }
}

const VOLUME_TOPICS: VolumeTopicDef[] = [
  {
    topicKey: 'intro',
    title:    '거래량이란?',
    steps: [
      {
        stepTitle: '거래량 막대를 보세요.',
        stepBody:  '차트 아래에 막대들이 있어요. 막대가 높을수록 그날 더 많은 주식이 거래됐다는 뜻이에요. 하이라이트된 막대가 특히 높죠.',
        useHL:     true,
      },
      {
        stepTitle: '거래량은 "시장 참여도"예요.',
        stepBody:  '거래량이 갑자기 늘어나면 시장의 관심이 집중됐다는 신호예요. 중요한 뉴스나 추세 변화가 있을 때 거래량이 급증해요.',
        useHL:     true,
      },
      {
        stepTitle: '거래량은 가격 움직임의 신뢰도예요.',
        stepBody:  '거래량 없이 오른 가격보다, 거래량이 많게 오른 가격이 더 믿음직스러워요. 많은 사람이 참여했다는 증거이기 때문이에요.',
        useHL:     false,
      },
    ],
    quiz: {
      question:     '거래량이 갑자기 늘어났을 때 의미는?',
      correctValue: 'market-attention',
      choices: [
        { value: 'market-attention', label: '시장의 관심이 집중됐다는 신호예요',   feedback: '맞아요! 거래량 급증은 많은 사람이 참여했다는 뜻이에요.' },
        { value: 'always-buy',       label: '무조건 매수해야 하는 신호예요',       feedback: '거래량 급증이 항상 매수 신호는 아니에요. 방향(상승/하락)을 함께 봐야 해요.' },
        { value: 'no-meaning',       label: '우연이라 의미 없어요',               feedback: '거래량 급증은 시장에서 무언가 중요한 일이 일어나고 있다는 신호예요.' },
      ],
    },
  },
  {
    topicKey: 'up-surge',
    title:    '거래량 급증 구간',
    steps: [
      {
        stepTitle: '이 날 거래량이 급증했어요.',
        stepBody:  '평소보다 훨씬 많은 거래가 일어났어요. 하이라이트된 막대의 높이를 주변과 비교해봐요.',
        useHL:     true,
      },
      {
        stepTitle: '가격과 거래량을 함께 보면 더 많은 게 보여요.',
        stepBody:  '이날 가격도 함께 상승했나요? 거래량 증가 + 가격 상승이면 강한 매수세가 유입됐다는 신호예요.\n\n반대로 거래량 증가 + 가격 하락이면 강한 매도세예요.',
        useHL:     true,
      },
      {
        stepTitle: '거래량 급증은 큰 움직임의 시작일 수 있어요.',
        stepBody:  '많은 사람이 참여했다는 건, 시장이 확신을 가지고 움직였다는 뜻이에요. 이런 날 이후 추세가 이어지는 경우가 많아요.',
        useHL:     false,
      },
    ],
    quiz: {
      question:     '거래량이 많은 날 가격이 상승했다면?',
      correctValue: 'strong-buy',
      choices: [
        { value: 'strong-buy',  label: '강한 매수세가 유입된 신호예요',        feedback: '맞아요! 많은 사람이 사면서 가격이 올라간 거예요. 신뢰도 높은 상승이에요.' },
        { value: 'risky',       label: '고점 신호라 위험해요',                feedback: '거래량을 동반한 상승은 강한 매수 신호예요. 무조건 위험하지 않아요.' },
        { value: 'coincidence', label: '우연의 일치예요',                     feedback: '거래량이 많다는 건 시장 참여가 활발하다는 뜻이에요. 의미 있는 움직임이에요.' },
      ],
    },
  },
  {
    topicKey: 'down-surge',
    title:    '거래량 감소 구간',
    steps: [
      {
        stepTitle: '이 구간 거래량을 주목하세요.',
        stepBody:  '하이라이트된 막대 주변의 흐름을 보세요. 거래량이 변화하고 있어요.',
        useHL:     true,
      },
      {
        stepTitle: '거래량 감소는 무기력한 시장 상태예요.',
        stepBody:  '거래량이 줄어든다는 건 참여자가 빠지고 있다는 뜻이에요. 강한 방향성 없이 표류할 가능성이 높아요.',
        useHL:     true,
      },
      {
        stepTitle: '거래량이 뒷받침되지 않는 움직임은 약해요.',
        stepBody:  '가격이 오르더라도 거래량이 감소 중이라면, 그 상승은 오래 지속되기 어려워요. 이를 "거래량 다이버전스"라고 해요.',
        useHL:     false,
      },
    ],
    quiz: {
      question:     '가격이 오르는데 거래량은 계속 줄어든다면?',
      correctValue: 'weak-signal',
      choices: [
        { value: 'weak-signal', label: '참여자가 줄고 있어 신뢰도가 낮아요', feedback: '맞아요! 거래량이 뒷받침되지 않는 상승은 쉽게 꺾일 수 있어요.' },
        { value: 'strong',      label: '매수자가 없어도 오르니까 더 강한 신호예요', feedback: '실제로는 반대예요. 거래량 없는 상승은 실제 수요가 부족하다는 뜻이에요.' },
        { value: 'buy-now',     label: '지금이 매수 타이밍이에요',           feedback: '거래량 감소 중 상승은 주의가 필요한 신호예요. 성급한 매수는 위험해요.' },
      ],
    },
  },
  {
    topicKey: 'divergence',
    title:    '거래량 + 캔들 조합',
    steps: [
      {
        stepTitle: '거래량과 캔들 방향을 함께 보세요.',
        stepBody:  '하이라이트된 막대와 그날의 캔들을 동시에 확인해봐요. 방향과 거래량이 일치하나요, 다르나요?',
        useHL:     true,
      },
      {
        stepTitle: '방향과 거래량이 일치할 때가 강한 신호예요.',
        stepBody:  '상승 + 거래량 증가 = 강한 매수\n하락 + 거래량 증가 = 강한 매도\n\n이 조합이 나타나면 추세가 이어질 가능성이 높아요.',
        useHL:     true,
      },
      {
        stepTitle: '방향과 거래량이 반대일 때 조심해요.',
        stepBody:  '상승 + 거래량 감소 = 약한 상승 (오래 가기 어려움)\n하락 + 거래량 감소 = 약한 하락 (곧 반등 가능)\n\n이럴 때는 방향 전환이 올 수 있어요.',
        useHL:     false,
      },
    ],
    quiz: {
      question:     '하락하면서 거래량도 매우 많다면?',
      correctValue: 'strong-sell',
      choices: [
        { value: 'strong-sell', label: '강한 매도세가 있었다는 신호예요',        feedback: '맞아요! 많은 사람이 동시에 팔았다는 뜻이에요. 추가 하락이 이어질 수 있어요.' },
        { value: 'buy-signal',  label: '공포 매도라 매수 기회예요',              feedback: '공포 매도일 수 있지만, 단순히 거래량이 많다는 이유만으로 매수하기는 위험해요.' },
        { value: 'no-meaning',  label: '거래량이 많아도 방향이 중요하지 않아요', feedback: '거래량 + 방향의 조합이 핵심이에요. 하락 + 거래량 급증은 강한 매도 신호예요.' },
      ],
    },
  },
  {
    topicKey: 'quiz',
    title:    '거래량 실전 확인',
    steps: [
      {
        stepTitle: '이 날의 거래량과 캔들을 같이 보세요.',
        stepBody:  '하이라이트된 날의 거래량 막대 높이와, 그날 캔들의 방향(양봉/음봉)을 함께 확인해봐요.',
        useHL:     true,
      },
      {
        stepTitle: '주변 날들과 비교해보세요.',
        stepBody:  '주변 거래량 막대들과 높이를 비교해봐요. 거래량이 높은지 낮은지, 가격은 올랐는지 내렸는지 파악해봐요.',
        useHL:     true,
      },
    ],
    quiz: {
      question:     '거래량이 평균보다 2배 높고, 그날 양봉이었다면 어떤 신호인가요?',
      correctValue: 'strong-upward',
      choices: [
        { value: 'strong-upward', label: '강한 매수세 유입으로 신뢰도 높은 상승이에요', feedback: '맞아요! 거래량 + 양봉 조합은 강한 매수 참여의 증거예요.' },
        { value: 'danger',        label: '거래량이 너무 많아서 고점일 수 있어요',        feedback: '경우에 따라 맞을 수 있지만, 기본적으로 이 조합은 강한 매수 신호예요.' },
        { value: 'meaningless',   label: '운이 좋아서 오른 것일 뿐이에요',              feedback: '거래량을 동반한 상승은 많은 참여자의 의지가 반영된 거예요. 의미 있는 신호예요.' },
      ],
    },
  },
]

/* ─── 메인 빌더 함수 ──────────────────────────────────── */

export function buildVolumeLearningSteps(data: CandleData[]): TutorialStep[] {
  if (!data.length) return []

  const steps: TutorialStep[] = []
  let firstHL: LearningHighlight | null = null

  for (const topic of VOLUME_TOPICS) {
    const loc = findVolumePattern(data, topic.topicKey)
    if (!loc) continue

    const hl = makeVolumeHL(
      loc.candleIndex,
      loc.windowFrom,
      loc.windowTo,
      loc.candleIndex,
    )

    // 첫 주제의 HL을 intro 단계에서 사용
    if (!firstHL) firstHL = hl

    for (let si = 0; si < topic.steps.length; si++) {
      const s = topic.steps[si]
      const step: TutorialStep = {
        id:             `volume-${topic.topicKey}-step${si}`,
        targetSelector: '#chart-area',
        floatSide:      'bottom-right',
        position:       'top',
        title:          s.stepTitle,
        body:           s.stepBody,
        actionRequired: 'free',
      }
      // 첫 번째 단계에서 learningHighlightOnEnter 설정
      if (si === 0) {
        step.learningHighlightOnEnter = s.useHL ? hl : undefined
      }
      steps.push(step)
    }

    // 퀴즈 단계
    steps.push({
      id:             `volume-${topic.topicKey}-quiz`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '확인 문제',
      body:           topic.quiz.question,
      actionRequired: 'judgment',
      judgment: {
        question:     topic.quiz.question,
        correctValue: topic.quiz.correctValue,
        choices:      topic.quiz.choices,
      },
    })
  }

  // 완료 단계
  steps.push({
    id:                       'volume-complete',
    targetSelector:           '#chart-area',
    floatSide:                'bottom-right',
    position:                 'top',
    title:                    '거래량 학습 완료!',
    body:                     '거래량의 기본 개념을 모두 배웠어요.\n\n핵심 요약:\n• 거래량 + 상승 = 강한 매수세\n• 거래량 + 하락 = 강한 매도세\n• 거래량 없는 움직임 = 신뢰도 낮음',
    tips: [
      '거래량은 혼자 보지 말고 캔들 방향과 함께 봐요',
      '평균보다 2배 이상 급증하면 중요한 사건이 있었을 가능성이 높아요',
      '실전 챌린지에서 거래량도 함께 분석해봐요',
    ],
    actionRequired:           'free',
    learningHighlightOnEnter: null,   // 완료 시 하이라이트 해제
  })

  return steps
}
