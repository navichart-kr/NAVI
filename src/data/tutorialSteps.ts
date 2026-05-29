import type { TutorialStep } from '@/types'

export const tutorialSteps: TutorialStep[] = [

  // ══════════════════════════════════════════════════════════
  // STEP 1  캔들 클릭 — "이 막대 하나가 하루예요"
  // ══════════════════════════════════════════════════════════
  {
    id:             'candle-click',
    targetSelector: '#chart-area',
    position:       'bottom',
    title:          '📊 이 막대 하나가 하루예요',
    body:           '초록 막대는 오른 날, 빨간 막대는 내린 날이에요. 막대의 길이가 그날의 가격 변동폭이에요.\n\n직접 클릭하면 그날의 시가·고가·저가·종가를 확인할 수 있어요.',
    mission:        '차트에서 아무 캔들이나 클릭해보세요 🙂',
    actionRequired: 'candle-click',
    completionMessage: '이게 차트의 모든 정보가 담긴 단위예요. 이것만 알아도 차트의 절반은 읽은 거예요!',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 2  MA 켜기
  // ══════════════════════════════════════════════════════════
  {
    id:             'ma-toggle',
    targetSelector: '#btn-moving-average',
    position:       'right',
    title:          '📈 이동평균선(MA) — 방향을 알려줘요',
    body:           'MA는 "최근 N일 평균 가격"을 이은 선이에요. 선이 올라가면 평균 가격이 오르고 있다는 뜻이에요.\n\n캔들이 선 위에 있으면 지금 평균보다 비싸게 거래 중이에요.',
    mission:        '아래 분석 도구에서 MA 버튼을 클릭해보세요 — 선들이 차트에 나타나요',
    actionRequired: 'indicator-toggle',
    indicatorKey:   'moving-average',
    completionMessage: '4개의 선은 각각 5일·20일·60일·120일 평균이에요. 선들이 함께 위를 향하면 상승 추세 신호예요.',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 3  MA 추세 판단 — 최근 3개월 구간
  // ══════════════════════════════════════════════════════════
  {
    id:               'ma-judgment',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 90,   // 최근 3개월 구간으로 줌
    title:            '🤔 이 구간의 MA 선 방향을 봐요',
    body:             '차트가 최근 3개월 구간으로 이동됐어요. MA 선들이 이 구간에서 어느 방향을 향하고 있는지 눈으로 확인해보세요.\n\n선들이 모여서 위로 향하면 상승 추세, 아래로 향하면 하락 추세예요.',
    actionRequired:   'judgment',
    judgment: {
      question: '이 구간에서 MA 선들이 어느 방향을 향하나요?',
      choices: [
        {
          value:    'up',
          icon:     '📈',
          label:    '위로 향하고 있다',
          feedback: '맞아요! 이동평균선들이 함께 위를 향하면 상승 추세 신호예요. 단기선(노랑)이 장기선(빨강) 위에 있을수록 강한 상승이에요.',
        },
        {
          value:    'sideways',
          icon:     '➡️',
          label:    '횡보하거나 잘 모르겠다',
          feedback: '솔직한 반응이에요! 선들이 뒤엉켜 있으면 추세가 불분명한 상태예요. 이럴 땐 RSI, MACD 같은 보조 지표를 함께 봐요.',
        },
        {
          value:    'down',
          icon:     '📉',
          label:    '아래로 향하고 있다',
          feedback: '이동평균선이 내려가면 하락 추세 신호예요. 어떤 기간을 보느냐에 따라 다르게 보일 수 있어요. 단기·장기 관점을 같이 보는 게 중요해요.',
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // STEP 4  볼린저 밴드 켜기 (MA 자동 OFF)
  // ══════════════════════════════════════════════════════════
  {
    id:                      'bb-toggle',
    targetSelector:          '#btn-bollinger',
    position:                'right',
    clearIndicatorsOnEnter:  ['moving-average'],
    title:                   '〰️ 볼린저 밴드(BB) — 변동성을 한눈에',
    body:                    'BB는 주가 위아래로 두 개의 밴드를 그려요. 밴드 간격이 좁아지면 곧 큰 움직임이 올 수 있다는 신호예요.\n\n• 상단 밴드 돌파 → 강한 상승 or 과매수\n• 하단 밴드 이탈 → 강한 하락 or 과매도',
    mission:                 '아래 분석 도구에서 BB 버튼을 클릭해보세요 — 캔들 주변에 밴드가 생겨요',
    actionRequired:          'indicator-toggle',
    indicatorKey:            'bollinger',
    completionMessage:       '캔들이 밴드 안에서 움직이면 정상, 밴드를 벗어나면 과열·침체 신호로 읽어요.',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 5  볼린저 밴드 판단 — 최근 45일 구간
  // ══════════════════════════════════════════════════════════
  {
    id:               'bb-judgment',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 45,   // 최근 45일 구간 — 밴드 폭이 잘 보이는 단위
    title:            '🔎 이 구간의 밴드 간격을 봐요',
    body:             '차트가 최근 45일 구간으로 이동됐어요. 위아래 파란 밴드의 간격이 지금 어떻게 보이는지 확인해보세요.\n\n밴드가 넓어지면 변동성이 크고, 좁아지면(스퀴즈) 잠잠한 상태예요.',
    actionRequired:   'judgment',
    judgment: {
      question: '이 구간에서 볼린저 밴드의 간격이 어떻게 보여요?',
      choices: [
        {
          value:    'squeeze',
          icon:     '🔴',
          label:    '좁아지고 있다 (스퀴즈)',
          feedback: '밴드 스퀴즈! 가격이 오래 눌려있다는 신호예요. 곧 위아래 어느 방향으로든 큰 움직임이 올 수 있어요. 이때 방향이 중요해요.',
        },
        {
          value:    'wide',
          icon:     '🟢',
          label:    '넓어지고 있다',
          feedback: '변동성이 확대되는 구간이에요. 상승이든 하락이든 강하게 움직이고 있다는 뜻이에요. 캔들이 어느 밴드 쪽에 있는지 함께 확인해요.',
        },
        {
          value:    'unknown',
          icon:     '⚪',
          label:    '잘 모르겠다',
          feedback: '처음엔 구분이 어려워요! 가운데 점선(MA20)과 양쪽 선의 간격을 비교해보세요. 평소보다 좁아 보이면 스퀴즈예요.',
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // STEP 6  RSI 켜기 (BB 자동 OFF)
  // ══════════════════════════════════════════════════════════
  {
    id:                      'rsi-toggle',
    targetSelector:          '#btn-rsi',
    position:                'right',
    clearIndicatorsOnEnter:  ['bollinger'],
    title:                   '🌡️ RSI — "지금 과열인가요?"',
    body:                    'RSI는 0~100 사이 숫자로 주가가 얼마나 빠르게 움직이는지 보여줘요.\n\n• 70 이상 → 과매수(너무 많이 오름) → 조정 가능성\n• 30 이하 → 과매도(너무 많이 내림) → 반등 가능성\n• 50 기준으로 강세/약세 구분',
    mission:                 '아래 분석 도구에서 RSI 버튼을 켜보세요 — 차트 아래에 새 그래프가 나타나요',
    actionRequired:          'indicator-toggle',
    indicatorKey:            'rsi',
    completionMessage:       '보라색 선이 RSI예요. 빨간 선(70)과 초록 선(30) 사이에서 움직이는지 확인해봐요.',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 7  RSI 읽기 판단 — 최근 30일
  // ══════════════════════════════════════════════════════════
  {
    id:               'rsi-judgment',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 30,   // 최근 30일 — RSI 오른쪽 끝 값이 명확히 보임
    title:            '🔍 RSI 선의 현재 위치를 찾아봐요',
    body:             '차트가 최근 30일 구간으로 이동됐어요. 아래 RSI 그래프에서 보라색 선이 오른쪽 끝에서 어느 구간에 있는지 확인해보세요.\n\n오른쪽 숫자가 실시간 RSI 값이에요.',
    actionRequired:   'judgment',
    judgment: {
      question: '오른쪽 끝 RSI 선이 어느 구간에 있나요?',
      choices: [
        {
          value:    'overbought',
          icon:     '🔴',
          label:    '70 근처 또는 위 (과열)',
          feedback: '과매수 구간이에요! 가격이 단기간에 너무 많이 올랐다는 신호예요. 강한 상승장에선 오래 머물기도 해요. 다른 지표와 같이 봐야 해요.',
        },
        {
          value:    'neutral',
          icon:     '⚪',
          label:    '30~70 사이 (중립)',
          feedback: '중립 구간이에요. 방향을 확신하기 어려운 시점이에요. MA 추세와 함께 보면 더 명확히 파악할 수 있어요.',
        },
        {
          value:    'oversold',
          icon:     '🟢',
          label:    '30 근처 또는 아래 (침체)',
          feedback: '과매도 구간이에요! 가격이 단기간에 너무 많이 내렸다는 신호예요. 반등 가능성이 있지만, 하락 추세가 강할 땐 계속 떨어지기도 해요.',
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // STEP 8  MACD 켜기 (RSI 자동 OFF)
  // ══════════════════════════════════════════════════════════
  {
    id:                      'macd-toggle',
    targetSelector:          '#btn-macd',
    position:                'right',
    clearIndicatorsOnEnter:  ['rsi'],
    title:                   '🔄 MACD — "추세가 바뀌려나?"',
    body:                    'MACD는 두 이동평균선의 차이로 추세 전환 시점을 포착해요.\n\n• 파란선(MACD)이 주황선(시그널)을 위로 교차 → 매수 신호\n• 파란선이 주황선을 아래로 교차 → 매도 신호\n• 히스토그램 막대가 0선 위면 상승 모멘텀',
    mission:                 '아래 분석 도구에서 MACD 버튼을 켜보세요 — 새 히스토그램이 나타나요',
    actionRequired:          'indicator-toggle',
    indicatorKey:            'macd',
    completionMessage:       '막대(히스토그램)가 0선 위면 상승 모멘텀, 아래면 하락 모멘텀이에요. 파란선과 주황선의 교차 순간을 주목하세요.',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 9  MACD 신호 판단 — 최근 60일
  // ══════════════════════════════════════════════════════════
  {
    id:               'macd-judgment',
    targetSelector:   '#chart-area',
    position:         'bottom',
    focusBarsFromEnd: 60,   // 최근 60일 — MACD 선 관계가 잘 보임
    title:            '📡 MACD 선 위치를 파악해봐요',
    body:             '차트가 최근 60일 구간으로 이동됐어요. MACD 그래프에서 파란선과 주황선의 위치를 오른쪽 끝 기준으로 확인해보세요.',
    actionRequired:   'judgment',
    judgment: {
      question: '오른쪽 끝에서 파란선(MACD)과 주황선(시그널)의 위치가 어때요?',
      choices: [
        {
          value:    'macd-above',
          icon:     '🔵',
          label:    '파란선이 주황선 위에 있다',
          feedback: '매수 신호 상태예요! MACD선이 시그널선 위에 있으면 상승 모멘텀이 있다는 뜻이에요. MA가 같은 방향이면 신뢰도가 더 높아져요.',
        },
        {
          value:    'signal-above',
          icon:     '🟠',
          label:    '주황선이 파란선 위에 있다',
          feedback: '하락 압력 상태예요! MACD선이 시그널선 아래에 있으면 하락 모멘텀이 있다는 신호예요. RSI도 같이 확인해봐요.',
        },
        {
          value:    'crossing',
          icon:     '✕',
          label:    '거의 비슷한 위치다',
          feedback: '교차 직전일 수 있어요! 두 선이 가까워지면 추세 전환 가능성이 높아져요. 다음에 어느 방향으로 벌어지는지를 주목하세요.',
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // STEP 10  추세선 — 직접 그어봐요 (MACD 자동 OFF)
  // ══════════════════════════════════════════════════════════
  {
    id:                      'trendline-intro',
    targetSelector:          '#drawing-tools-card',
    position:                'top',
    clearIndicatorsOnEnter:  ['macd'],
    title:                   '↗ 추세선 — 방향을 직접 그어봐요',
    body:                    '추세선은 저점과 저점(또는 고점과 고점)을 이어서 차트의 방향을 직접 확인하는 도구예요.\n\n두 번 클릭으로 선 하나가 완성돼요.',
    tips: [
      '작도 도구에서 "↗ 추세선" 버튼을 클릭해요',
      '차트에서 저점 두 개를 차례로 클릭하면 선이 완성돼요',
      '잘못 그렸다면 ✕ 지우기로 한 번에 초기화할 수 있어요',
    ],
    mission:        '추세선을 한 번 직접 그어보세요 (안 그려도 다음으로 넘어갈 수 있어요)',
    actionRequired: 'free',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 11  피보나치 — 되돌림 구간 찾기
  // ══════════════════════════════════════════════════════════
  {
    id:             'fibonacci-intro',
    targetSelector: '#drawing-tools-card',
    position:       'top',
    title:          '𝚽 피보나치 — 되돌림 구간 찾기',
    body:           '피보나치 되돌림은 상승(또는 하락) 구간에서 얼마나 되돌아갈지 예측하는 데 써요. 고점→저점을 클릭하면 자동으로 레벨이 표시돼요.',
    tips: [
      '작도 도구에서 "𝚽 피보나치" 버튼을 클릭해요',
      '고점과 저점을 차례로 클릭하면 레벨이 자동 표시돼요',
      '38.2%, 50%, 61.8% 구간이 되돌림 지지/저항선으로 많이 쓰여요',
    ],
    mission:        '피보나치를 한 번 그어보세요 (안 그려도 다음으로 넘어갈 수 있어요)',
    actionRequired: 'free',
  },

  // ══════════════════════════════════════════════════════════
  // STEP 12  완료 + 시뮬레이션 연결
  // ══════════════════════════════════════════════════════════
  {
    id:             'simulate-cta',
    targetSelector: '#simulate-link',
    position:       'bottom',
    title:          '🎉 차트를 이미 읽고 있어요!',
    body:           '방금 실제 차트를 직접 만지고, 지표를 켜고, 직접 판단까지 해봤어요.\n\n이제 과거 NVDA 데이터를 보고 미래를 직접 예측해볼 수 있어요. 틀려도 괜찮아요 — 결과를 보며 배우는 게 진짜 공부예요.',
    tips: [
      '예측 시점 이후 30일이 숨겨져 있어요',
      'MA, RSI, MACD를 켜고 분석한 뒤 예측해봐요',
      '결과를 보며 왜 틀렸는지 확인하는 게 핵심이에요',
    ],
    actionRequired: 'free',
  },
]
