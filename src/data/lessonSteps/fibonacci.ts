import type { TutorialStep } from '@/types'

/**
 * 피보나치 심화 레슨 — 6단계
 *
 * 교육용 구간: 2026-03-30 저점 $356.28 → 2026-06-01 고점 $466.32 (+30.9% 상승)
 * 이후 2026-06-03 $424.25에서 38.2% 레벨($424.28)에 거의 정확히 반등
 *
 * 흐름: 개념 → 차트 관찰 → 직접 작도(가이드 마커) → 레벨 해설 → 퀴즈 → 완료
 * MA·RSI·MACD·BB 전부 OFF — 피보나치 요소에만 집중
 * focusBarsFromEnd: 55 → 2026-03-18 ~ 2026-06-04
 * floatSide: 'bottom-right' → 차트 가림 방지
 */
export const fibonacciSteps: TutorialStep[] = [

  // ── STEP 1  개념 소개 ─────────────────────────────────────
  {
    id:                     'fib-adv-intro',
    targetSelector:         '#drawing-tools-card',
    mobileTargetSelector:   '#drawing-toolbar',
    position:               'left',
    clearIndicatorsOnEnter: ['rsi', 'macd', 'bollinger', 'moving-average'],
    clearDrawingsOnEnter:   true,
    focusBarsFromEnd:       55,
    title:                  '피보나치 심화 — 조정 구간을 예측해봐요',
    body:                   '가격이 강하게 오른 뒤 얼마나 내려갈까요?\n\n피보나치 되돌림은 이 조정 폭을 예측하는 도구예요. 저점→고점을 두 번 클릭하면 주요 레벨이 자동으로 그려져요.\n\n주요 레벨:\n• 38.2% — 얕은 조정 (강한 상승 추세)\n• 50% — 중간 조정 (심리적 지지)\n• 61.8% — 깊은 조정 (황금 비율)',
    actionRequired:         'free',
  },

  // ── STEP 2  실제 사례 관찰 ────────────────────────────────
  {
    id:               'fib-adv-observe',
    targetSelector:   '#chart-area',
    position:         'right',
    focusBarsFromEnd: 55,
    title:            '실제 반등 사례를 확인해봐요',
    body:             'MSFT는 이 구간에서 $356 → $466까지 약 +31% 강하게 상승했어요.\n\n이후 조정이 와서 잠시 하락했다가 다시 반등했어요.\n\n차트를 보며 확인해봐요:\n• 상승이 시작된 저점(왼쪽 아래)은 어디인가요?\n• 상승이 멈춘 고점(오른쪽 위)은 어디인가요?\n• 고점 이후 가격이 어디서 멈추고 반등했나요?\n\n이 세 지점이 다음 단계의 핵심이에요.',
    actionRequired:   'free',
  },

  // ── STEP 3  직접 피보나치 작도 (가이드 마커) ─────────────
  // 저점(좌하단)·고점(우상단)이 대각선 위치 → 어느 쪽도 가리지 않으려면
  // 분석도구 카드(좌열)를 기준으로 오른쪽(우하단 도구 영역)에 카드를 배치
  {
    id:                   'fib-adv-draw',
    targetSelector:       '#analysis-tools-card',
    mobileTargetSelector: '#drawing-toolbar',
    position:             'right',
    focusBarsFromEnd:     55,
    clearDrawingsOnEnter: true,
    fibGuide: {
      lowDate:   '2026-03-30',
      lowPrice:  356.28,
      highDate:  '2026-06-01',
      highPrice: 466.32,
    },
    title:          '피보나치를 직접 그어봐요',
    body:           '차트를 보면 초록색 ① 저점과 주황색 ② 고점 마커가 표시돼 있어요.\n\n작도 도구 → 피보나치 버튼을 클릭한 뒤\n그 순서대로 클릭해봐요:\n① 저점 클릭 → ② 고점 클릭\n\n두 번 클릭하면 피보나치 레벨이 자동으로 그려져요.',
    tips: [
      '화면 상단에 "① 저점을 클릭하세요" 안내가 뜰 거예요',
      '저점 클릭 후 "② 고점을 클릭하세요"로 바뀌어요',
      '두 점을 찍으면 38.2% · 50% · 61.8% 레벨이 표시돼요',
    ],
    mission:        '피보나치를 직접 그어봐요 (안 그려도 다음으로 넘어갈 수 있어요)',
    actionRequired: 'free',
  },

  // ── STEP 4  레벨 해설 ─────────────────────────────────────
  {
    id:               'fib-adv-explain',
    targetSelector:   '#chart-area',
    position:         'right',
    focusBarsFromEnd: 55,
    title:            '각 레벨의 의미와 실제 반응을 확인해봐요',
    body:             '이 구간(저점 $356 → 고점 $466)에 피보나치를 적용하면:\n\n• 23.6% ≈ $440 — 가격이 잠깐 머문 구간\n• 38.2% ≈ $424 — 강한 조정 후 반등 구간\n• 50.0% ≈ $411 — 심리적 중간 지점\n• 61.8% ≈ $398 — 황금 비율, 깊은 조정 구간\n\n실제로 가격이 $424 부근에서 멈추고 다시 상승했어요.\n어느 레벨에서 반등이 시작됐는지 차트를 보며 확인해봐요.',
    tips: [
      '레벨 근처에서 캔들이 여러 개 뭉치면 강한 지지예요',
      '강한 상승 추세에서는 38.2%에서 먼저 반등하는 경우가 많아요',
      '61.8%까지 내려가면 추세가 약해지는 신호일 수 있어요',
    ],
    actionRequired:   'free',
  },

  // ── STEP 5  퀴즈 ──────────────────────────────────────────
  {
    id:               'fib-adv-levels',
    targetSelector:   '#chart-area',
    position:         'right',
    focusBarsFromEnd: 55,
    title:            '이 차트에서 가격은 어느 레벨에서 반등했을까요?',
    body:             '앞에서 확인한 차트를 떠올려봐요.\n\n고점 $466에서 조정 후 가격이 멈추고 반등한 피보나치 레벨은 어디일까요?\n\n힌트: 반등이 시작된 저점은 $424 부근이에요.',
    actionRequired:   'judgment',
    judgment: {
      question:     '이 구간에서 가격이 반등한 피보나치 레벨은?',
      correctValue: '382',
      hints: [
        '고점 $466 - 저점 $356 = 범위 $110',
        '38.2% 레벨은 $466 - $110×0.382 ≈ $424',
        '실제 저점 $424.25는 $424 레벨과 거의 일치해요',
      ],
      choices: [
        {
          value:    '236',
          label:    '23.6% (약 $440)',
          feedback: '23.6%는 $440 부근이에요. 가격이 $440까지만 내려오고 반등했다면 추세가 극도로 강한 거예요. 이 구간에서는 더 깊게 조정이 왔어요.',
        },
        {
          value:    '382',
          label:    '38.2% (약 $424)',
          feedback: '맞아요! +31% 상승 후 38.2% 레벨($424) 부근에서 반등이 시작됐어요. 강한 상승 추세에서는 38.2%에서 매수세가 먼저 유입되는 경우가 많아요. 실제 저점 $424.25는 이론값 $424.28과 거의 정확히 일치했어요.',
        },
        {
          value:    '50',
          label:    '50% (약 $411)',
          feedback: '50% 레벨은 $411 부근이에요. 실제 저점 $424.25보다 아래에 있어요. 반등은 그 전에 이미 시작됐어요.',
        },
        {
          value:    '618',
          label:    '61.8% (약 $398)',
          feedback: '61.8%는 $398 부근이에요. 이 구간까지 하락하지 않고 38.2%에서 반등했어요. 추세가 강할수록 얕은 레벨에서 반등이 일어나요.',
        },
      ],
    },
    completionMessage: '38.2% 반등을 확인했어요! 추세가 강할수록 얕은 레벨(38.2%)에서 매수세가 유입돼요.',
  },

  // ── STEP 6  완료 ──────────────────────────────────────────
  {
    id:               'fib-adv-complete',
    targetSelector:   '#chart-area',
    position:         'right',
    focusBarsFromEnd: 55,
    title:            '피보나치 심화 완료',
    body:             '실제 MSFT 차트에서 피보나치를 직접 그리고, 38.2% 반등을 눈으로 확인했어요.\n\n핵심 정리:\n• 강한 추세 → 38.2%에서 먼저 반등\n• 중간 추세 → 50%에서 지지\n• 약한 추세 → 61.8%까지 하락 후 반등\n• 더 깊이 내려갈수록 → 추세 전환 경고\n\n실전 챌린지에서 피보나치를 활용해봐요!',
    tips: [
      '38.2%에서 반등 → 상승 추세 지속 가능성 높음',
      '61.8% 이상 하락 → 추세 약화 신호',
      'MA 방향 + 피보나치 레벨이 겹치면 강력한 지지',
    ],
    actionRequired:   'free',
  },
]
