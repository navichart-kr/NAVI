import type { TutorialStep, CandleData } from '@/types'

/**
 * 피보나치 심화 레슨 — 2023년 1월 실제 사례 기반
 *
 * 교육 구간: 2023-01-05 저점 -> 2023-02-09 고점
 * - MSFT가 강하게 +XX% 상승한 뒤, 38.2% 레벨에서 지지를 받고
 *   이후 장기 상승으로 이어지는 교과서적 피보나치 반등 사례.
 *
 * 데이터 요건: '전체' 기간(ALL) 데이터 필요.
 * startLesson 에서 자동으로 period='ALL' 전환 후 데이터가 준비되면 호출된다.
 */

/* ── 상수 ──────────────────────────────────────────────── */
const FIB_RATIOS = [
  { key: '236' as const, ratio: 0.236, label: '23.6%' },
  { key: '382' as const, ratio: 0.382, label: '38.2%' },
  { key:  '50' as const, ratio: 0.500, label: '50%'   },
  { key: '618' as const, ratio: 0.618, label: '61.8%' },
]

type FibKey = '236' | '382' | '50' | '618'

interface FibSwing {
  lowDate:     string
  lowPrice:    number
  highDate:    string
  highPrice:   number
  bounceDate:  string
  bouncePrice: number
  fibKey:      FibKey
}

/* ── 날짜 탐색 헬퍼 ────────────────────────────────────── */
/** date 이상인 첫 번째 인덱스 반환. 없으면 -1 */
function findDateIdx(data: CandleData[], date: string): number {
  for (let i = 0; i < data.length; i++) {
    if (data[i].time >= date) return i
  }
  return -1
}

/* ── 스윙 탐지 ─────────────────────────────────────────── */
/**
 * 2023-01-05 저점 -> 2023-02-09 고점 스윙을 데이터에서 찾는다.
 * 데이터에 2023년 데이터가 없으면 null 반환.
 */
function findFibSwing(data: CandleData[]): FibSwing | null {
  const N = data.length
  if (N < 100) return null

  // 2023-01-05 전후에서 저점 찾기 (±5 거래일 내 최저 종가)
  const loStart = findDateIdx(data, '2023-01-03')
  const loEnd   = findDateIdx(data, '2023-01-12')
  if (loStart < 0 || loEnd < 0) return null   // 데이터에 2023년 없음

  let loIdx = loStart
  for (let i = loStart; i <= Math.min(loEnd, N - 1); i++) {
    if (data[i].close < data[loIdx].close) loIdx = i
  }
  const lowDate  = data[loIdx].time
  const lowPrice = data[loIdx].close

  // 2023-02-09 전후에서 고점 찾기 (±5 거래일 내 최고 종가)
  const hiStart = findDateIdx(data, '2023-02-06')
  const hiEnd   = findDateIdx(data, '2023-02-15')
  if (hiStart < 0 || hiEnd < 0) return null

  let hiIdx = hiStart
  for (let i = hiStart; i <= Math.min(hiEnd, N - 1); i++) {
    if (data[i].close > data[hiIdx].close) hiIdx = i
  }
  const highDate  = data[hiIdx].time
  const highPrice = data[hiIdx].close

  // 유효성 검증
  if (hiIdx <= loIdx) return null
  const rally = (highPrice - lowPrice) / lowPrice
  if (rally < 0.12) return null   // 최소 12% 상승 필요

  // 되돌림 저점: 2023-02-09 이후 ~ 2023-04-01 사이에서 최저 종가 탐색
  const pbStart = hiIdx + 1
  const pbEnd   = findDateIdx(data, '2023-04-01')
  if (pbStart >= N || pbEnd < 0) return null

  let pbIdx = pbStart
  for (let i = pbStart; i <= Math.min(pbEnd, N - 1); i++) {
    if (data[i].close < data[pbIdx].close) pbIdx = i
  }
  const bounceDate  = data[pbIdx].time
  const bouncePrice = data[pbIdx].close

  // 되돌림 비율 계산
  const range       = highPrice - lowPrice
  const retracement = (highPrice - bouncePrice) / range

  // 38.2% 레벨 부근인지 확인 (±15% 허용)
  const diff382 = Math.abs(retracement - 0.382)
  if (diff382 > 0.15) {
    // 38.2%에서 너무 멀면 가장 가까운 레벨로 선택
    let closest = FIB_RATIOS[0], closestDiff = Infinity
    for (const f of FIB_RATIOS) {
      const d = Math.abs(retracement - f.ratio)
      if (d < closestDiff) { closestDiff = d; closest = f }
    }
    // 그래도 반등이 확인됐으면 해당 레벨로 사용
    const fibKey = closestDiff < 0.20 ? closest.key : '382' as FibKey

    return {
      lowDate, lowPrice, highDate, highPrice,
      bounceDate, bouncePrice,
      fibKey,
    }
  }

  return {
    lowDate, lowPrice, highDate, highPrice,
    bounceDate, bouncePrice,
    fibKey: '382',
  }
}

/* ── 단계 생성 ─────────────────────────────────────────── */
export function buildFibonacciSteps(data: CandleData[]): TutorialStep[] {
  const swing = findFibSwing(data)
  if (!swing) {
    // 데이터에 2023년이 없을 때 임시 안내 단계 (startLesson 에서 데이터 로드 후 재호출됨)
    return [{
      id:             'fib-adv-loading',
      targetSelector: '#chart-area',
      position:       'bottom',
      title:          '데이터를 불러오는 중이에요',
      body:           '전체 기간 데이터를 가져오고 있어요. 잠시만 기다려주세요.',
      actionRequired: 'free',
    }]
  }

  return buildStepsFromSwing(swing)
}

/* ── 스윙 -> 단계 빌더 ─────────────────────────────────── */
function buildStepsFromSwing(swing: FibSwing): TutorialStep[] {
  const { lowDate, lowPrice, highDate, highPrice,
          bounceDate, bouncePrice, fibKey } = swing

  const range    = highPrice - lowPrice
  const rallyPct = Math.round(range / lowPrice * 100)

  const fib236 = highPrice - range * 0.236
  const fib382 = highPrice - range * 0.382
  const fib50  = highPrice - range * 0.500
  const fib618 = highPrice - range * 0.618

  const f  = (p: number) => '$' + p.toFixed(0)
  const fl = (p: number) => '$' + p.toFixed(2)

  // 정답 레벨 가격
  const correctFibPrice =
    fibKey === '236' ? fib236 :
    fibKey === '382' ? fib382 :
    fibKey ===  '50' ? fib50  : fib618

  const correctFib = FIB_RATIOS.find(r => r.key === fibKey)!

  // 되돌림 비율 (정수 퍼센트)
  const retPct = Math.round((highPrice - bouncePrice) / range * 100)

  // 정답 시 피드백 메시지
  const correctFeedbacks: Record<FibKey, string> = {
    '236': `맞아요! 23.6% 레벨(${f(fib236)}) 부근에서 반등이 시작됐어요. 추세가 매우 강할 때 나타나는 얕은 조정이에요.`,
    '382': `맞아요! 38.2% 레벨(${f(fib382)}) 부근에서 반등이 시작됐어요. 강한 상승 추세에서 가장 자주 나타나는 첫 번째 지지 레벨이에요.`,
     '50': `맞아요! 50% 레벨(${f(fib50)}) 부근에서 반등이 시작됐어요. 심리적 중간 지점에서 매수세가 유입된 사례예요.`,
    '618': `맞아요! 61.8% 레벨(${f(fib618)}) 부근에서 반등이 시작됐어요. 황금 비율 레벨에서 강한 지지를 받은 사례예요.`,
  }

  // 오답 시 피드백 메시지
  const wrongFeedback = (key: FibKey, price: number): string => {
    if (fibKey === key) return correctFeedbacks[key]
    const relation = price > bouncePrice ? '실제 반등점보다 위' : '실제 반등점보다 아래'
    return `${correctFib.label} 레벨(${f(correctFibPrice)}) 부근에서 반등이 시작됐어요. ${f(price)}는 ${relation}에 있어요.`
  }

  // 38.2% 반등 이후 상승 설명 (완료 단계용)
  const afterBounceDesc = fibKey === '382'
    ? `38.2% 레벨(${f(fib382)}) 부근에서 반등한 뒤, MSFT는 이후 장기 상승으로 이어졌어요. 강한 추세에서 38.2%는 첫 번째 지지선 역할을 해요.`
    : `${correctFib.label} 레벨에서 반등한 뒤 MSFT는 상승세를 이어갔어요.`

  // 피보나치 레슨 전용 날짜 줌 구간
  // 저점(2023-01) ~ 반등 안정화(2023-06) 구간을 명확하게 보여준다
  const focusDateRange = { from: '2022-10-01', to: '2023-07-01' }

  return [

    /* STEP 1  개념 소개 */
    {
      id:                     'fib-adv-intro',
      targetSelector:         '#drawing-tools-card',
      mobileTargetSelector:   '#drawing-toolbar',
      position:               'left',
      clearIndicatorsOnEnter: ['rsi', 'macd', 'bollinger', 'moving-average'],
      clearDrawingsOnEnter:   true,
      focusDateRange,
      title:                  '피보나치 심화 — 실제 반등 구간을 확인해봐요',
      body:                   `피보나치 되돌림이 실제 시장에서 얼마나 정확한지 MSFT 2023년 실제 사례로 직접 확인해봐요.\n\n${lowDate.slice(0, 7)} 저점에서 ${highDate.slice(0, 7)} 고점까지 +${rallyPct}% 강하게 상승한 뒤, 어느 피보나치 레벨에서 지지를 받고 다시 상승했는지 눈으로 확인할 수 있어요.\n\n주요 레벨:\n• 38.2% — 강한 추세의 첫 번째 지지선\n• 50% — 심리적 중간 지점\n• 61.8% — 황금 비율, 깊은 조정 구간`,
      actionRequired:         'free',
    },

    /* STEP 2  실제 사례 관찰 */
    {
      id:               'fib-adv-observe',
      targetSelector:   '#chart-area',
      position:         'right',
      focusDateRange,
      title:            '저점에서 고점까지 상승을 확인해봐요',
      body:             `MSFT는 ${lowDate} 저점 ${fl(lowPrice)}에서 ${highDate} 고점 ${fl(highPrice)}까지 약 +${rallyPct}% 강하게 상승했어요.\n\n차트 왼쪽에 저점(초록 마커)과 고점(주황 마커)이 표시돼 있어요.\n\n고점 이후 가격이 어디서 멈추고 다시 반등했는지 확인해봐요:\n• 되돌림 저점은 ${bounceDate} ${fl(bouncePrice)} 부근이에요\n• 고점 대비 약 ${retPct}% 되돌렸어요\n• 이 지점이 어느 피보나치 레벨에 해당하는지 다음 단계에서 확인해요`,
      actionRequired:   'free',
    },

    /* STEP 3  피보나치 작도 */
    {
      id:                         'fib-adv-draw',
      targetSelector:             '#chart-area',
      position:                   'right',
      focusDateRange,
      clearDrawingsOnEnter:       true,
      activateDrawingToolOnEnter: 'fibonacci',
      fibGuide: {
        lowDate,
        lowPrice,
        highDate,
        highPrice,
      },
      title:          '피보나치를 직접 그어봐요',
      body:           `차트에 초록색 ① 저점(${fl(lowPrice)})과 주황색 ② 고점(${fl(highPrice)}) 마커가 표시돼 있어요.\n\n피보나치 그리기 모드가 자동으로 활성화됐어요.\n화면 상단 안내를 따라 두 번만 클릭해봐요:\n① 저점 클릭  ② 고점 클릭\n\n두 번 클릭하면 피보나치 레벨이 자동으로 그려져요.`,
      tips: [
        '화면 상단에 "① 상승 시작 저점을 클릭하세요" 안내가 떠 있어요',
        '저점 클릭 후 "② 이제 고점을 클릭해서 완성하세요"로 바뀌어요',
        '두 점을 찍으면 23.6%, 38.2%, 50%, 61.8% 레벨이 표시돼요',
      ],
      mission:        '① 저점 ② 고점 순서로 클릭해봐요 (안 그려도 다음으로 넘어갈 수 있어요)',
      actionRequired: 'free',
    },

    /* STEP 4  레벨 해설 */
    {
      id:               'fib-adv-explain',
      targetSelector:   '#chart-area',
      position:         'right',
      focusDateRange,
      title:            '각 레벨과 실제 가격 반응을 확인해봐요',
      body:             `저점 ${fl(lowPrice)} ~ 고점 ${fl(highPrice)} 구간에 피보나치를 적용하면:\n\n• 23.6%  ${f(fib236)} — 가격이 짧게 머문 구간\n• 38.2%  ${f(fib382)} — 강한 조정 후 지지 구간\n• 50.0%  ${f(fib50)} — 심리적 중간 지점\n• 61.8%  ${f(fib618)} — 황금 비율, 깊은 조정 구간\n\n실제로 ${bounceDate}에 가격이 ${fl(bouncePrice)} 부근에서 멈추고 다시 상승했어요.\n이 가격이 어느 레벨에 해당하는지 차트에서 확인해봐요.`,
      tips: [
        '레벨 근처에서 캔들이 여러 개 뭉치면 강한 지지 신호예요',
        '강한 상승 추세에서는 38.2%가 첫 번째 지지선 역할을 해요',
        '61.8%까지 내려가면 추세가 약해지는 신호일 수 있어요',
      ],
      actionRequired:   'free',
    },

    /* STEP 5  퀴즈 */
    {
      id:               'fib-adv-levels',
      targetSelector:   '#chart-area',
      position:         'right',
      focusDateRange,
      title:            '이 차트에서 가격은 어느 레벨에서 반등했을까요?',
      body:             `고점 ${fl(highPrice)} 이후 조정을 받은 가격이 다시 반등한 피보나치 레벨은 어디일까요?\n\n힌트: 반등이 시작된 저점은 ${fl(bouncePrice)} 부근이에요.`,
      actionRequired:   'judgment',
      judgment: {
        question:     '이 구간에서 가격이 반등한 피보나치 레벨은?',
        correctValue: fibKey,
        hints: [
          `고점 ${f(highPrice)} - 저점 ${f(lowPrice)} = 범위 ${f(range)}`,
          `${correctFib.label} 레벨 = ${f(highPrice)} - ${f(range)} x ${correctFib.ratio} = ${f(correctFibPrice)} 부근`,
          `실제 반등 저점 ${fl(bouncePrice)}은 이 레벨과 가장 가깝게 일치해요`,
        ],
        choices: [
          {
            value:    '236',
            label:    `23.6% (${f(fib236)})`,
            feedback: wrongFeedback('236', fib236),
          },
          {
            value:    '382',
            label:    `38.2% (${f(fib382)})`,
            feedback: wrongFeedback('382', fib382),
          },
          {
            value:    '50',
            label:    `50% (${f(fib50)})`,
            feedback: wrongFeedback('50', fib50),
          },
          {
            value:    '618',
            label:    `61.8% (${f(fib618)})`,
            feedback: wrongFeedback('618', fib618),
          },
        ],
      },
      // completionMessage 는 choice feedback 과 다른 내용으로 설정 (중복 방지)
      completionMessage: afterBounceDesc,
    },

    /* STEP 6  완료 */
    {
      id:               'fib-adv-complete',
      targetSelector:   '#chart-area',
      position:         'bottom',
      focusDateRange,
      title:            '피보나치 심화 완료',
      body:             `${afterBounceDesc}\n\n핵심 정리:\n• 강한 추세 → 38.2%에서 첫 번째 반등\n• 중간 추세 → 50%에서 지지\n• 약한 추세 → 61.8%까지 하락 후 반등\n• 61.8% 이상 하락 → 추세 전환 경고\n\n실전 챌린지에서 피보나치를 활용해봐요!`,
      tips: [
        '38.2% 반등 후 추세 지속 → 상승 추세 강화 신호',
        '61.8% 이상 하락 → 포지션 재검토 필요',
        'MA 방향 + 피보나치 레벨이 겹치면 더욱 강력한 지지',
      ],
      actionRequired:   'free',
    },
  ]
}

/* ── 하위 호환성 export ─────────────────────────────────── */
export const fibonacciSteps: TutorialStep[] = []
