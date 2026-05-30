import type { TutorialStep } from '@/types'

/**
 * 피보나치 심화 레슨 — 5단계
 * 목표: 고점·저점 직접 선택 + 핵심 레벨 체득 + 지지/저항 판단
 */
export const fibonacciSteps: TutorialStep[] = [

  // ── STEP 1  피보나치 개념 소개 ───────────────────────────
  {
    id:                     'fib-adv-intro',
    targetSelector:         '#drawing-tools-card',
    position:               'left',
    clearIndicatorsOnEnter: ['rsi', 'macd', 'bollinger'],
    clearDrawingsOnEnter:   true,
    title:                  '피보나치 심화 — 되돌림 구간 찾기',
    body:                   '강한 상승(또는 하락) 후 가격은 얼마나 되돌아갈까요?\n\n피보나치 되돌림은 이 되돌림 구간을 예측하는 도구예요. 38.2%, 50%, 61.8%가 주요 지지·저항선으로 많이 쓰여요.',
    actionRequired:         'free',
  },

  // ── STEP 2  올바른 작도 방법 ─────────────────────────────
  {
    id:                        'fib-adv-trend',
    targetSelector:            '#btn-moving-average',
    position:                  'top',
    activateIndicatorsOnEnter: ['moving-average'],
    focusBarsFromEnd:          120,
    title:                     '피보나치 그리기 — 올바른 순서는?',
    body:                      'MA 선이 활성화됐어요. 상승 추세가 보이나요?\n\n피보나치 되돌림을 그릴 때 상승 추세에서는 어떤 순서로 클릭해야 할까요?',
    actionRequired:            'judgment',
    judgment: {
      question:     '상승 추세에서 피보나치를 그리는 올바른 순서는?',
      correctValue: 'low_to_high',
      hints: [
        '피보나치는 추세의 시작점 → 끝점 순으로 그려요',
        '상승 추세의 시작점 = 저점 (낮은 가격)',
        '상승 추세의 끝점 = 고점 (높은 가격)',
      ],
      choices: [
        {
          value:    'low_to_high',
          icon:     '↑',
          label:    '저점 → 고점 클릭',
          feedback: '정확해요! 상승 추세에서는 저점을 먼저, 고점을 나중에 클릭해요. 그러면 조정(되돌림) 구간인 38.2%, 50%, 61.8% 레벨이 자동으로 표시돼요.',
        },
        {
          value:    'high_to_low',
          icon:     '↓',
          label:    '고점 → 저점 클릭',
          feedback: '고점→저점은 하락 추세에서 사용해요. 상승 추세에서는 저점→고점 순서가 올바른 방법이에요.',
        },
        {
          value:    'any_order',
          icon:     '→',
          label:    '순서 무관',
          feedback: '피보나치는 추세 방향에 따라 그리는 순서가 달라요. 상승 추세에서는 반드시 저점→고점 순서로 그려야 해요.',
        },
      ],
    },
  },

  // ── STEP 3  직접 피보나치 그리기 ────────────────────────
  {
    id:             'fib-adv-draw',
    targetSelector: '#drawing-tools-card',
    position:       'left',
    title:          '피보나치를 직접 그어봐요',
    body:           '작도 도구 → 피보나치 버튼을 클릭하고 차트에서 직접 그어봐요.\n\n상승 추세라면: 저점 클릭 → 고점 클릭\n하락 추세라면: 고점 클릭 → 저점 클릭',
    tips: [
      '피보나치 버튼 클릭 후 차트에서 두 점을 클릭해요',
      '강한 추세의 시작점과 끝점을 선택해요',
      '23.6% · 38.2% · 50% · 61.8% · 78.6% 레벨이 표시돼요',
    ],
    mission:        '피보나치를 한 번 직접 그어봐요 (안 그려도 다음으로 넘어갈 수 있어요)',
    actionRequired: 'free',
  },

  // ── STEP 4  핵심 레벨 판단 ─────────────────────────────
  {
    id:             'fib-adv-levels',
    targetSelector: '#chart-area',
    position:       'bottom',
    title:          '어느 레벨이 가장 강한 지지일까요?',
    body:           '피보나치의 세 핵심 레벨 38.2%, 50%, 61.8% 중\n가격이 가장 자주 멈추고 반등하는 구간은 어디일까요?\n\n직접 그린 피보나치를 보며 판단해봐요.',
    actionRequired: 'judgment',
    judgment: {
      question:     '3개의 핵심 레벨 중 가장 강한 지지로 알려진 곳은?',
      correctValue: '618',
      hints: [
        '1.618은 자연에서 발견되는 황금 비율이에요',
        '0.618은 1 ÷ 1.618 — 황금 비율의 역수예요',
        '트레이더들이 가장 많이 주목하는 레벨이라 지지 효과가 강해요',
      ],
      choices: [
        {
          value:    '382',
          icon:     '→',
          label:    '38.2%',
          feedback: '38.2%는 약한 조정 후 강한 상승 추세에서 나타나요. 추세가 강할수록 여기서 반등하고 바로 올라가요. 하지만 가장 강한 지지선은 아니에요.',
        },
        {
          value:    '50',
          icon:     '→',
          label:    '50%',
          feedback: '50%는 피보나치 수학적 비율은 아니지만 심리적으로 중요한 구간이에요. 많은 트레이더가 주목하지만 황금 비율보다는 신뢰도가 낮아요.',
        },
        {
          value:    '618',
          icon:     '✓',
          label:    '61.8% (황금 비율)',
          feedback: '맞아요! 61.8%는 황금 비율로 불리며 피보나치에서 가장 강한 지지·저항 구간이에요. 이 레벨에서 반등하면 추세가 계속될 가능성이 높아요.',
        },
      ],
    },
    completionMessage: '61.8% 레벨을 기억해두세요. 실전 챌린지에서 피보나치를 그려 이 구간을 찾아봐요!',
  },

  // ── STEP 5  심화 완료 ────────────────────────────────────
  {
    id:             'fib-adv-complete',
    targetSelector: '#chart-area',
    position:       'bottom',
    title:          '피보나치 심화 완료',
    body:           '올바른 작도 순서를 이해하고, 핵심 레벨을 직접 판단해봤어요.\n\n핵심:\n• 상승 추세 → 저점→고점 순서로 클릭\n• 61.8% = 황금 비율 (가장 강한 지지·저항)\n• 캔들이 이 레벨에서 멈추면 반전 신호\n\n실전 챌린지에서 피보나치를 활용해봐요!',
    tips: [
      '38.2% = 약한 조정 / 61.8% = 강한 조정',
      '61.8%에서 반등하면 추세 지속 가능성 높음',
      '볼린저 밴드와 피보나치 레벨이 겹치면 강력한 신호',
    ],
    actionRequired: 'free',
  },
]
