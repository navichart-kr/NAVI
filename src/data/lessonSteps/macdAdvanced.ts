import type { TutorialStep } from '@/types'

/**
 * MACD 심화 레슨 — 5단계
 * 목표: 관찰 → 판단 → 검증 구조로 교차 신호 체득
 * floatSide: 'bottom-right' → MACD 차트를 가리지 않음
 */
export const macdAdvancedSteps: TutorialStep[] = [

  // ── STEP 1  MACD 활성화 ────────────────────────────────
  {
    id:                        'macd-adv-activate',
    targetSelector:            '#btn-macd',
    completionTargetSelector:  '#macd-chart',
    position:                  'top',
    clearIndicatorsOnEnter:    ['moving-average', 'bollinger', 'rsi'],
    title:                  'MACD 심화 — 교차 신호를 찾아봐요',
    body:                   '기초에서 파란선(MACD)과 주황선(시그널)의 교차를 배웠어요.\n\n이번엔 실제 차트에서 교차가 발생한 위치를 직접 찾고, 히스토그램의 의미를 판단해봐요.',
    mission:                'MACD 버튼을 켜봐요',
    actionRequired:         'indicator-toggle',
    indicatorKey:           'macd',
    completionMessage:      'MACD 차트가 나타났어요. 파란선(MACD), 주황선(시그널), 막대(히스토그램) 3가지를 확인해봐요.',
  },

  // ── STEP 2  골든크로스 원리 ─────────────────────────────
  {
    id:               'macd-adv-golden',
    targetSelector:   '#macd-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 120,
    title:            '골든크로스 — 히스토그램은 어떻게 될까요?',
    body:             'MACD 차트를 보세요.\n파란선(MACD)이 주황선(시그널)을 아래에서 위로 교차하는 구간이 골든크로스예요.\n\n이 교차 순간, 히스토그램 막대는 어떻게 변할까요?',
    actionRequired:   'judgment',
    judgment: {
      question:     '골든크로스 발생 시 히스토그램 값은?',
      correctValue: 'negative_to_positive',
      hints: [
        '히스토그램 = MACD - 시그널 (두 선의 차이)',
        '파란선이 주황선 위로 올라가면 MACD > 시그널',
        'MACD - 시그널 값이 양수(+)가 돼요',
      ],
      choices: [
        {
          value:    'negative_to_positive',
          icon:     '↑',
          label:    '음수(-)에서 양수(+)로',
          feedback: '정확해요! MACD선이 시그널선 위로 올라가면 두 선의 차이(히스토그램)가 0을 넘어 양수(+)로 바뀌어요. 히스토그램이 0선을 돌파하는 게 골든크로스 신호예요.',
        },
        {
          value:    'stays_positive',
          icon:     '→',
          label:    '양수(+)를 유지한다',
          feedback: '교차가 일어나기 직전까지는 파란선이 주황선 아래에 있어요. 즉 교차 전은 히스토그램이 음수(-) 상태예요.',
        },
        {
          value:    'no_change',
          icon:     '↓',
          label:    '변화가 없다',
          feedback: '히스토그램은 두 선의 차이값이라 교차가 일어나면 반드시 0선을 넘어요.',
        },
      ],
    },
  },

  // ── STEP 3  데드크로스 원리 ────────────────────────────
  {
    id:               'macd-adv-dead',
    targetSelector:   '#macd-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 200,
    title:            '데드크로스 — 어떤 신호일까요?',
    body:             '반대로 파란선(MACD)이 주황선(시그널)을 위에서 아래로 교차하는 구간이 데드크로스예요.\n\nMACD 차트에서 데드크로스 구간을 찾아보고, 이 신호의 의미를 판단해봐요.',
    actionRequired:   'judgment',
    judgment: {
      question:     '데드크로스는 어떤 신호인가요?',
      correctValue: 'bearish',
      hints: [
        '파란선이 주황선 아래로 내려가면 MACD < 시그널',
        '히스토그램이 0선 아래(음수)로 바뀌어요',
        '하락 압력이 커지는 상황이에요',
      ],
      choices: [
        {
          value:    'bearish',
          icon:     '↓',
          label:    '하락 모멘텀 시작 신호',
          feedback: '맞아요! 데드크로스는 하락 모멘텀의 시작 신호예요. 특히 0선 위에서 교차가 일어나면 더 강한 신호예요. 이후 가격 흐름과 연결해서 확인해봐요.',
        },
        {
          value:    'bullish',
          icon:     '↑',
          label:    '강한 매수 신호',
          feedback: '데드크로스는 반대예요. 파란선이 주황선 아래로 떨어지는 것은 하락 압력이 커지는 신호예요.',
        },
        {
          value:    'neutral',
          icon:     '→',
          label:    '중립 — 신호 없음',
          feedback: '교차는 항상 의미 있는 변화예요. 데드크로스는 상승세가 꺾이는 신호로 많이 활용돼요.',
        },
      ],
    },
  },

  // ── STEP 4  히스토그램 독해 ─────────────────────────────
  {
    id:               'macd-adv-histogram',
    targetSelector:   '#macd-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 60,
    title:            '히스토그램 — 교차의 예고 신호',
    body:             'MACD 차트의 막대(히스토그램)를 보세요.\n막대 길이가 추세의 강도를 보여줘요.\n\n막대가 점점 짧아지고 있다면 무슨 의미일까요?',
    actionRequired:   'judgment',
    judgment: {
      question:     '히스토그램 막대가 점점 짧아지고 있다면?',
      correctValue: 'weakening',
      hints: [
        '막대가 짧아진다 = 두 선의 차이가 줄어든다',
        '차이가 줄어들면 두 선이 가까워지는 중',
        '두 선이 만나면? → 교차가 일어나요',
      ],
      choices: [
        {
          value:    'weakening',
          icon:     '⚡',
          label:    '추세 약화 — 교차 예고',
          feedback: '정확해요! 막대가 짧아진다는 건 두 선이 점점 가까워지는 신호예요. 곧 교차(신호 전환)가 일어날 수 있어요. 이 구간에서 미리 대비할 수 있어요.',
        },
        {
          value:    'strengthening',
          icon:     '↑',
          label:    '추세 강화 중',
          feedback: '막대가 커지면 추세가 강해지는 거예요. 짧아지는 건 반대로 추세가 약해지는 신호예요.',
        },
        {
          value:    'reversal',
          icon:     '↓',
          label:    '즉각적 반전 확정',
          feedback: '아직 확정은 아니에요. 짧아지는 건 예고 신호예요. 실제로 0선을 돌파하는 교차가 일어날 때 신호가 확정돼요.',
        },
      ],
    },
  },

  // ── STEP 5  심화 완료 ────────────────────────────────────
  {
    id:               'macd-adv-complete',
    targetSelector:   '#macd-chart',
    position:         'top',
    floatSide:        'bottom-right',
    focusBarsFromEnd: 30,
    title:            'MACD 심화 완료',
    body:             '골든크로스, 데드크로스, 히스토그램을 직접 판단해봤어요.\n\n핵심:\n• 히스토그램이 0선을 돌파 = 교차 발생\n• 막대가 짧아지면 교차 예고\n• 0선 위 골든크로스 = 강한 신호\n\n실전 챌린지에서 MACD를 활용해봐요!',
    tips: [
      '히스토그램이 점점 줄어들면 교차가 임박했어요',
      '0선 위 골든크로스 = 강세 확인 신호',
      '0선 아래 골든크로스 = 반등 시작 가능성',
    ],
    actionRequired:   'free',
  },
]
