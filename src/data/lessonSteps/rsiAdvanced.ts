import type { TutorialStep } from '@/types'

/**
 * RSI 심화 레슨 — 5단계
 * 목표: 과매수/과매도 개념 체득 + RSI·MA 결합 해석
 * floatSide: 'bottom-right' → RSI 차트를 가리지 않음
 */
export const rsiAdvancedSteps: TutorialStep[] = [

  // ── STEP 1  RSI 활성화 ─────────────────────────────────
  {
    id:                        'rsi-adv-activate',
    targetSelector:            '#btn-rsi',
    completionTargetSelector:  '#rsi-chart',
    position:                  'top',
    clearIndicatorsOnEnter:    ['moving-average', 'bollinger', 'macd'],
    title:                   'RSI 심화 — 과매수·과매도를 읽어봐요',
    body:                    '기초에서 배운 RSI 70/30 룰을 실제 차트에 적용해봐요.\n\n숫자를 외우는 게 아니라 — RSI가 이 구간에 있을 때 무슨 의미인지 직접 판단해봐요.',
    mission:                 'RSI 버튼을 켜봐요',
    actionRequired:          'indicator-toggle',
    indicatorKey:            'rsi',
    completionMessage:       '보라색 RSI 선이 나타났어요. 70선(빨간)과 30선(초록) 사이에서 어떻게 움직이는지 확인해봐요.',
  },

  // ── STEP 2  과매수 구간 판단 ─────────────────────────────
  {
    id:               'rsi-adv-overbought',
    targetSelector:   '#rsi-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 120,
    title:            'RSI 70 이상 — 이 상태의 이름은?',
    body:             'RSI 보라색 선이 빨간 기준선(70)을 넘은 구간을 찾아봐요.\n\nRSI 값이 70을 넘었을 때 이 상태를 무엇이라고 부르나요?',
    actionRequired:   'judgment',
    judgment: {
      question:     'RSI 70+ 상태의 명칭은?',
      correctValue: 'overbought',
      hints: [
        'RSI 70 이상 = 매수세가 지나치게 강한 상태',
        '너무 빠르게, 너무 많이 올랐다는 의미',
        '"과(過) + 매수(買受)" — 사는 힘이 넘쳤다',
      ],
      choices: [
        {
          value:    'overbought',
          icon:     '↑',
          label:    '과매수 (상승 과열)',
          feedback: '맞아요! RSI 70+ = 과매수 구간이에요. 상승이 너무 빠르게 진행됐다는 경고 신호예요. 이후 조정이 올 수 있지만, 강세장에서는 오래 지속되기도 해요. MA 방향으로 추세도 함께 확인해봐요.',
        },
        {
          value:    'oversold',
          icon:     '↓',
          label:    '과매도 (하락 과열)',
          feedback: '과매도는 반대예요. RSI가 30 아래로 떨어진 상태예요. 70 위는 상승 과열이에요.',
        },
        {
          value:    'neutral',
          icon:     '→',
          label:    '중립 구간',
          feedback: 'RSI 40~60이 중립 구간이에요. 70을 넘으면 과열 상태예요.',
        },
      ],
    },
  },

  // ── STEP 3  과매도 구간 판단 ─────────────────────────────
  {
    id:               'rsi-adv-oversold',
    targetSelector:   '#rsi-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 240,
    title:            'RSI 30 이하 — 어떤 가능성이 생길까요?',
    body:             'RSI가 초록 기준선(30) 아래로 내려간 구간을 찾아봐요.\n\nRSI 30 아래는 "과매도" 구간이에요.\n이 상황에서 일반적으로 어떤 가능성이 높아질까요?',
    actionRequired:   'judgment',
    judgment: {
      question:     'RSI 30- 과매도 구간에서 주시해야 할 것은?',
      correctValue: 'bounce',
      hints: [
        '과매도 = 너무 빠르게, 너무 많이 하락했다',
        '빠른 하락 후에는 반발 매수가 들어올 수 있어요',
        '단, MA 방향이 상승 배열일 때 신뢰도가 높아요',
      ],
      choices: [
        {
          value:    'bounce',
          icon:     '↑',
          label:    '반등 가능성',
          feedback: '맞아요! 과매도는 너무 빠르게 떨어졌다는 신호예요. 반등 가능성이 높아지지만 — MA 방향도 함께 확인해야 해요. 다음 단계에서 RSI + MA 조합을 배워볼게요.',
        },
        {
          value:    'sell',
          icon:     '↓',
          label:    '즉시 매도 신호',
          feedback: '과매도는 오히려 매수 고려 신호예요. 너무 많이 떨어졌으니 반등을 기대할 수 있어요.',
        },
        {
          value:    'ignore',
          icon:     '→',
          label:    '신호 무시',
          feedback: '과매도 구간은 중요한 신호예요. 반등 가능성을 항상 주시하고 MA와 함께 확인해봐요.',
        },
      ],
    },
  },

  // ── STEP 4  RSI + MA 결합 해석 ───────────────────────────
  {
    id:                        'rsi-adv-combine',
    targetSelector:            '#btn-moving-average',
    mobileTargetSelector:      '#chart-area',
    completionTargetSelector:  '#chart-area',
    position:                  'top',
    activateIndicatorsOnEnter: ['moving-average'],
    title:                     'RSI + MA 함께 보기',
    body:                      'MA를 함께 켜봐요. RSI와 MA가 같은 방향을 가리킬 때 신뢰도가 올라가요.\n\n• RSI 70+ & MA 상승 배열 → 강한 상승\n• RSI 30- & MA 하락 배열 → 강한 하락\n• RSI 30- & MA 상승 배열 → 반등 유력',
    actionRequired:            'free',
    completionMessage:         'MA 선들이 활성화됐어요. RSI와 MA 방향을 함께 비교해봐요.',
  },

  // ── STEP 5  심화 완료 ────────────────────────────────────
  {
    id:               'rsi-adv-complete',
    targetSelector:   '#rsi-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 30,
    title:            'RSI 심화 완료',
    body:             '과매수·과매도 구간을 직접 판단하고 검증해봤어요.\n\n핵심:\n• RSI 70+ = 과매수 (상승 과열)\n• RSI 30- = 과매도 (반등 가능성)\n• MA 방향이 RSI 신호를 확인해줘요\n\n실전 챌린지에서 이 개념을 적용해봐요!',
    tips: [
      'RSI 70+ & MA 하향 = 강한 매도 신호',
      'RSI 30- & MA 상향 = 강한 매수 신호',
      '신호가 쌓일수록 예측 확신이 높아져요',
    ],
    actionRequired:   'free',
  },
]
