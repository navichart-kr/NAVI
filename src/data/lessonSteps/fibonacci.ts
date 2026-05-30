import type { TutorialStep } from '@/types'

/**
 * 피보나치 심화 레슨 — 6단계
 *
 * 흐름: 개념 소개 → 실제 사례 관찰 → 직접 작도 → 레벨 해설 → 퀴즈 → 완료
 * MA·RSI·MACD·BB 완전 OFF — 피보나치 요소에만 집중
 */
export const fibonacciSteps: TutorialStep[] = [

  // ── STEP 1  개념 소개 + 초기화 ───────────────────────────
  {
    id: 'fib-adv-intro',
    targetSelector:         '#drawing-tools-card',
    position:               'left',
    clearIndicatorsOnEnter: ['rsi', 'macd', 'bollinger', 'moving-average'],
    clearDrawingsOnEnter:   true,
    focusBarsFromEnd:       120,
    title:                  '피보나치 심화 — 조정 구간을 예측해봐요',
    body:                   '가격이 강하게 오른 뒤 얼마나 내려갈까요?\n\n피보나치 되돌림은 이 조정 구간을 예측하는 도구예요.\n\n주요 레벨:\n• 38.2% — 얕은 조정 (추세 강세)\n• 50% — 중간 조정 (심리적 지지)\n• 61.8% — 깊은 조정 (황금 비율)',
    actionRequired:         'free',
  },

  // ── STEP 2  실제 사례 관찰 ───────────────────────────────
  {
    id:               'fib-adv-observe',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 120,
    title:            '차트에서 직접 확인해봐요',
    body:             '차트를 보세요.\n\n강한 상승 이후 가격이 되돌아오는 구간을 찾아봐요.\n\n• 상승이 시작된 저점은 어디인가요?\n• 상승이 멈춘 고점은 어디인가요?\n• 조정 이후 가격이 어디서 멈추고 반등했나요?\n\n이 세 지점을 기억해두세요. 다음 단계에서 직접 그어볼 거예요.',
    actionRequired:   'free',
  },

  // ── STEP 3  직접 피보나치 그리기 ────────────────────────
  {
    id:                   'fib-adv-draw',
    targetSelector:       '#drawing-tools-card',
    position:             'left',
    focusBarsFromEnd:     120,
    clearDrawingsOnEnter: true,
    title:                '피보나치를 직접 그어봐요',
    body:                 '작도 도구 → 피보나치(🌀) 버튼을 클릭하고\n차트에서 두 점을 찍으면 자동으로 레벨이 그려져요.\n\n상승 추세라면:\n① 상승 시작 저점 클릭\n② 고점 클릭\n\n화면 상단에 안내 메시지가 뜨면서 어느 점을 클릭해야 하는지 알려줄 거예요.',
    tips: [
      '강한 상승의 시작점(저점)을 먼저 클릭해요',
      '그 다음 가장 높은 고점을 클릭해요',
      '두 번 클릭하면 자동으로 레벨이 그려져요',
    ],
    mission:        '피보나치를 직접 그어봐요 (안 그려도 다음으로 넘어갈 수 있어요)',
    actionRequired: 'free',
  },

  // ── STEP 4  레벨 해설 (작도 결과 설명) ──────────────────
  {
    id:               'fib-adv-explain',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 120,
    title:            '각 레벨의 의미를 확인해봐요',
    body:             '피보나치가 그려졌다면 각 레벨을 확인해봐요.\n\n• 23.6% — 추세가 강할 때 여기서 반등\n• 38.2% — 일반적인 얕은 조정 구간\n• 50% — 심리적으로 중요한 중간 지점\n• 61.8% — 황금 비율, 가장 많은 트레이더가 주목하는 구간\n\n실제로 가격이 이 레벨 근처에서 멈추거나 반등했는지 차트를 보며 확인해봐요.',
    tips: [
      '레벨 근처에서 캔들이 여러 개 뭉쳐있으면 강한 지지예요',
      '큰 음봉이 레벨에 닿고 다음 캔들이 양봉이면 반등 신호',
      '여러 레벨이 겹치는 구간은 더욱 강한 지지·저항이에요',
    ],
    actionRequired:   'free',
  },

  // ── STEP 5  핵심 레벨 퀴즈 ─────────────────────────────
  {
    id:             'fib-adv-levels',
    targetSelector: '#chart-area',
    position:       'bottom',
    focusBarsFromEnd: 120,
    title:          '가장 강한 지지 레벨은 어디일까요?',
    body:           '앞에서 살펴본 차트에서 가격이 조정 후 반등한 구간을 기억해봐요.\n\n피보나치 레벨 중 가장 강한 지지·저항으로 알려진 구간은 어디일까요?',
    actionRequired: 'judgment',
    judgment: {
      question:     '3개의 핵심 레벨 중 가장 강한 지지로 알려진 곳은?',
      correctValue: '618',
      hints: [
        '자연에서 발견되는 황금 비율(1.618)의 역수예요',
        '전 세계 트레이더가 가장 많이 주목하는 레벨이에요',
        '가장 많은 매수 주문이 몰리는 구간이라 지지 효과가 강해요',
      ],
      choices: [
        {
          value:    '382',
          icon:     '→',
          label:    '38.2%',
          feedback: '38.2%는 추세가 강할 때 나타나는 얕은 조정 구간이에요. 여기서 반등하면 추세가 매우 강하다는 신호지만, 가장 강한 지지 레벨은 아니에요.',
        },
        {
          value:    '50',
          icon:     '→',
          label:    '50%',
          feedback: '50%는 수학적 피보나치 비율은 아니지만 심리적으로 중요해요. 많은 트레이더가 주목하지만 황금 비율 61.8%보다는 신뢰도가 낮아요.',
        },
        {
          value:    '618',
          icon:     '✓',
          label:    '61.8% (황금 비율)',
          feedback: '맞아요! 61.8%는 황금 비율로 불리며 피보나치에서 가장 강한 지지·저항 구간이에요. 전 세계 트레이더가 이 레벨을 주목하기 때문에 실제로 가격이 여기서 멈추고 반등하는 경우가 많아요.',
        },
      ],
    },
    completionMessage: '61.8% 레벨을 기억해두세요. 실전 챌린지에서 직접 그어보고 이 구간을 찾아봐요!',
  },

  // ── STEP 6  심화 완료 ────────────────────────────────────
  {
    id:               'fib-adv-complete',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 120,
    title:            '피보나치 심화 완료',
    body:             '피보나치를 직접 그리고, 레벨을 확인하고, 핵심 구간을 판단해봤어요.\n\n핵심 요약:\n• 상승 추세 → 저점→고점 순서로 클릭\n• 61.8% = 황금 비율 (가장 강한 지지)\n• 캔들이 이 레벨에서 멈추면 반전 신호\n\n실전 챌린지에서 피보나치를 직접 활용해봐요!',
    tips: [
      '38.2%에서 반등 → 강한 상승 추세 지속',
      '61.8%까지 되돌림 → 추세 지속 가능성 높음',
      'MA + 피보나치 레벨이 겹치면 더욱 강력한 신호',
    ],
    actionRequired:   'free',
  },
]
