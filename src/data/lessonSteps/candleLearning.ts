/**
 * candleLearning.ts — 캔들 패턴 학습 단계 자동 생성
 *
 * buildCandleLearningSteps(candleData)
 *   → 5개 패턴 × 7단계 + 종합 퀴즈 5문항 으로 구성된 TutorialStep[] 반환
 *
 * 각 패턴 단계 구조 (A~G):
 *   A 도입   — "이 캔들을 보세요"
 *   B 패턴명 — 이름 + 형태 설명
 *   C 의미   — 시장 심리
 *   D 예측   — judgment (3지선다)
 *   E 정답   — 패턴의 신호 방향 해설
 *   F 결과   — 실제 차트 공개 (zoom 확장)
 *   G 주의   — 확률 신호임을 강조
 */

import type { TutorialStep, CandleData, LearningHighlight } from '@/types'
import { findBestCandlePattern, type PatternType } from '@/lib/patternDetector'

/* ─── 패턴 레슨 설정 ───────────────────────────────────── */

interface PatternConfig {
  key:           PatternType
  name:          string         // 한국어명
  engName:       string         // 영어명
  shape:         string         // 형태 설명
  marketPsych:   string         // 시장 심리
  expectedDir:   'up' | 'down' | 'sideways'  // 패턴의 일반적 신호 방향
  predQuestion:  string         // 예측 질문
  signalSummary: string         // 신호 요약 (Step E 제목)
  signalDetail:  string         // 신호 상세 (Step E 본문)
  caution:       string         // 주의사항 (Step G)
  predChoices: Array<{
    value: 'up' | 'down' | 'sideways'
    label: string
    feedback: string
  }>
}

const PATTERN_CONFIGS: PatternConfig[] = [
  {
    key:          'hammer',
    name:         '망치형',
    engName:      'Hammer',
    shape:        '아래 꼬리가 길고 몸통은 위쪽에 작게 있어요. 마치 망치처럼 생겼죠.',
    marketPsych:  '주가가 크게 내려갔지만, 매수자들이 강하게 반발해서 다시 끌어올렸어요. 아래 꼬리의 길이가 그 힘을 보여줘요.',
    expectedDir:  'up',
    predQuestion: '하락하던 중에 나타난 이 망치형. 이후 주가는 어떻게 될 가능성이 높을까요?',
    signalSummary:'망치형은 상승 반전 가능성을 높이는 신호예요',
    signalDetail: '하락하던 흐름에서 강한 매수 반발이 나타났다는 뜻이에요. 특히 아래 꼬리가 길수록 매수 압력이 강했다는 신호예요.',
    caution:      '단, 망치형이 나타났다고 반드시 상승하는 건 아니에요. 다음 캔들이 실제로 양봉으로 마감하는지 확인하는 것이 중요해요.',
    predChoices: [
      { value: 'up',       label: '상승 가능성 증가', feedback: '맞아요! 망치형은 하락을 강한 매수세가 막아낸 패턴이에요. 상승 반전 가능성을 높여줘요.' },
      { value: 'down',     label: '하락 가능성 증가', feedback: '하락하는 힘을 매수자가 막아냈어요. 긴 아래 꼬리가 그 증거예요. 상승 반전 신호로 봐요.' },
      { value: 'sideways', label: '특별한 의미 없음',  feedback: '아래 꼬리가 길다는 건 매수 압력이 강하다는 뜻이에요. 이 패턴은 상승 반전 신호예요.' },
    ],
  },
  {
    key:          'bullish-engulfing',
    name:         '상승 장악형',
    engName:      'Bullish Engulfing',
    shape:        '빨간 캔들 다음 날, 더 큰 초록 캔들이 나왔어요. 초록 몸통이 빨간 몸통을 완전히 덮었어요.',
    marketPsych:  '어제의 매도 압력을 오늘의 매수자들이 완전히 압도했어요. 전날의 하락을 한 번에 뒤집은 강한 힘이에요.',
    expectedDir:  'up',
    predQuestion: '매도세를 완전히 삼켜버린 이 패턴. 이후 주가는 어떻게 될까요?',
    signalSummary:'상승 장악형은 강력한 매수 전환 신호예요',
    signalDetail: '두 캔들이 함께 만드는 패턴이에요. 전날 하락을 다음 날 강한 매수가 완전히 뒤집었다는 뜻이에요. 하락 추세 끝에서 더욱 강력한 신호가 돼요.',
    caution:      '단, 거래량도 함께 확인해야 해요. 거래량이 평소보다 많았다면 훨씬 신뢰도 높은 신호예요.',
    predChoices: [
      { value: 'up',       label: '상승 가능성 증가', feedback: '맞아요! 매수자가 매도자를 완전히 제압했어요. 상승 반전의 강력한 신호예요.' },
      { value: 'down',     label: '하락 가능성 증가', feedback: '초록 캔들이 빨간 캔들을 완전히 덮었어요. 매수 압력이 매도 압력을 압도한 거예요.' },
      { value: 'sideways', label: '특별한 의미 없음',  feedback: '두 캔들이 만드는 패턴으로, 전날 하락을 다음 날 완전히 뒤집은 강한 신호예요.' },
    ],
  },
  {
    key:          'doji',
    name:         '도지',
    engName:      'Doji',
    shape:        '시가와 종가가 거의 같아 몸통이 아주 작거나 없어요. 위아래로 꼬리가 나 있어요.',
    marketPsych:  '매수자와 매도자가 치열하게 싸웠지만 결국 비겼어요. 시장이 방향을 정하지 못한 상태예요.',
    expectedDir:  'sideways',
    predQuestion: '매수·매도 세력이 팽팽히 맞선 도지. 이후 주가는 어떻게 될 가능성이 높을까요?',
    signalSummary:'도지는 방향 불확실 신호예요',
    signalDetail: '도지 단독으로는 매수도 매도도 아니에요. 중요한 건 다음 캔들이에요. 도지 이후에 강한 방향성 캔들이 나오면, 그 방향으로 추세가 바뀔 수 있어요.',
    caution:      '도지가 자주 나타나는 구간은 시장이 고민 중인 구간이에요. 단독으로 매매 결정을 내리기보다, 다음 캔들을 확인하고 판단하는 게 좋아요.',
    predChoices: [
      { value: 'up',       label: '상승 가능성 증가', feedback: '도지는 방향성이 불명확해요. 이후 캔들을 봐야 알 수 있어요.' },
      { value: 'down',     label: '하락 가능성 증가', feedback: '도지는 하락 신호가 아니에요. 매수·매도 모두 결론을 못 낸 상태예요.' },
      { value: 'sideways', label: '방향 불확실',       feedback: '맞아요! 도지는 시장이 결정을 못 한 상태예요. 이후 캔들이 방향을 결정해줘요.' },
    ],
  },
  {
    key:          'shooting-star',
    name:         '유성형',
    engName:      'Shooting Star',
    shape:        '위 꼬리가 매우 길고 몸통은 아래쪽에 작게 있어요. 마치 위에서 떨어지는 별처럼 생겼죠.',
    marketPsych:  '매수자들이 주가를 높이 끌어올렸지만, 매도자들이 강하게 눌러버렸어요. 오르려다 실패한 거예요.',
    expectedDir:  'down',
    predQuestion: '상승하다 나타난 이 유성형. 이후 주가는 어떻게 될 가능성이 높을까요?',
    signalSummary:'유성형은 하락 반전 가능성을 높이는 신호예요',
    signalDetail: '망치형의 반대 버전이에요. 상승 추세에서 나타난 강한 위 꼬리는, 매수 시도가 실패했다는 뜻이에요. 특히 상승 추세 끝에서 더욱 주목해야 해요.',
    caution:      '유성형도 확인이 필요해요. 다음 날 실제로 음봉이 나와서 하락을 확인해줘야 신호가 완성돼요.',
    predChoices: [
      { value: 'up',       label: '상승 가능성 증가', feedback: '위 꼬리가 길다는 건 매수 시도가 실패했다는 뜻이에요. 하락 반전 가능성을 봐야 해요.' },
      { value: 'down',     label: '하락 가능성 증가', feedback: '맞아요! 상승 시도를 매도자가 막아낸 거예요. 하락 반전 신호로 봐요.' },
      { value: 'sideways', label: '특별한 의미 없음',  feedback: '긴 위 꼬리는 매도 압력이 강했다는 명확한 신호예요. 하락 반전을 경계해야 해요.' },
    ],
  },
  {
    key:          'marubozu',
    name:         '장대양봉',
    engName:      'Marubozu',
    shape:        '꼬리가 거의 없고 몸통이 길어요. 시가에서 시작해 거의 쉼 없이 종가까지 올라갔어요.',
    marketPsych:  '시작부터 끝까지 매수 압력이 압도적이었어요. 단 하루 동안 강한 매수세가 쏟아진 거예요.',
    expectedDir:  'up',
    predQuestion: '처음부터 끝까지 눌림이 없던 장대양봉. 이후 주가는 어떻게 될 가능성이 높을까요?',
    signalSummary:'장대양봉은 강한 상승 모멘텀의 신호예요',
    signalDetail: '하루 종일 매수자가 지배한 날이에요. 이런 강력한 매수 에너지는 이후 며칠간 지속되는 경향이 있어요.',
    caution:      '장대양봉 이후엔 단기 과매수로 인한 조정이 오기도 해요. 너무 급하게 따라 사지 말고, 잠깐 쉬어가는 자리를 기다리는 게 좋아요.',
    predChoices: [
      { value: 'up',       label: '상승 가능성 증가', feedback: '맞아요! 강한 매수 에너지는 이후에도 지속되는 경향이 있어요.' },
      { value: 'down',     label: '하락 가능성 증가', feedback: '장대양봉은 강한 매수 모멘텀이에요. 하락이 아닌 상승 지속을 봐야 해요.' },
      { value: 'sideways', label: '특별한 의미 없음',  feedback: '꼬리 없이 몸통만 가득 찬 건 강한 매수 압력의 신호예요.' },
    ],
  },
]

/* ─── 단계 생성 헬퍼 ──────────────────────────────────── */

const CONTEXT_BARS = 22   // 패턴 전후 표시할 봉 수

function makeHL(
  loc: { candleIndex: number; prevCandleIndex?: number; windowFrom: number; windowTo: number; outcome: 'up' | 'down' | 'sideways' },
  showResult: boolean,
): LearningHighlight {
  const windowTo = showResult
    ? loc.windowTo
    : Math.min(loc.candleIndex + 5, loc.windowTo)   // 결과 공개 전: 패턴 직후만 노출
  return {
    candleIndex:     loc.candleIndex,
    prevCandleIndex: loc.prevCandleIndex,
    windowFrom:      loc.windowFrom,
    windowTo,
    outcome:         loc.outcome,
    showResult,
    type:            'candle',
  }
}

/* ─── 메인 빌더 함수 ──────────────────────────────────── */

export function buildCandleLearningSteps(data: CandleData[]): TutorialStep[] {
  if (!data.length) return []

  const steps: TutorialStep[] = []

  for (const cfg of PATTERN_CONFIGS) {
    const loc = findBestCandlePattern(data, cfg.key)
    if (!loc) continue  // 패턴을 데이터에서 찾지 못하면 건너뜀

    const hlPre  = makeHL(loc, false)
    const hlPost = makeHL(loc, true)

    const outcomeTxt = loc.outcome === 'up'   ? '이후 실제로 상승했어요.'
                     : loc.outcome === 'down'  ? '이후 실제로 하락했어요.'
                     : '이후 큰 방향 변화 없이 횡보했어요.'

    const patternSignalDir = cfg.expectedDir
    const matchOutcome =
      patternSignalDir === 'up'       && loc.outcome === 'up'   ||
      patternSignalDir === 'down'     && loc.outcome === 'down' ||
      patternSignalDir === 'sideways' && loc.outcome === 'sideways'

    const resultContext = matchOutcome
      ? `${outcomeTxt} 이 경우 ${cfg.name} 패턴이 그대로 적용됐어요.`
      : `${outcomeTxt} 이번엔 패턴의 일반적 방향과 달랐어요. 패턴은 확률을 높이는 신호이지 확신이 아니에요.`

    // ── Step A: 도입 ───────────────────────────────────────
    steps.push({
      id:                       `${cfg.key}-a-intro`,
      targetSelector:           '#chart-area',
      floatSide:                'bottom-right',
      position:                 'top',
      title:                    '이 구간의 캔들을 보세요.',
      body:                     `차트가 자동으로 이 구간으로 이동했어요.\n특별한 모양의 캔들이 하이라이트 되어 있어요.`,
      actionRequired:           'free',
      learningHighlightOnEnter: hlPre,
    })

    // ── Step B: 패턴명 ─────────────────────────────────────
    steps.push({
      id:             `${cfg.key}-b-name`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          `이 캔들은 ${cfg.name}(${cfg.engName})이에요.`,
      body:           cfg.shape,
      actionRequired: 'free',
    })

    // ── Step C: 시장 심리 ──────────────────────────────────
    steps.push({
      id:             `${cfg.key}-c-meaning`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '이 캔들이 말하는 것',
      body:           cfg.marketPsych,
      actionRequired: 'free',
    })

    // ── Step D: 예측 (judgment) ────────────────────────────
    steps.push({
      id:             `${cfg.key}-d-predict`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          cfg.predQuestion,
      body:           '이후 구간은 아직 숨겨져 있어요. 배운 내용을 바탕으로 예측해봐요.',
      actionRequired: 'judgment',
      judgment: {
        question:     '이후 방향을 예측해보세요',
        correctValue: cfg.expectedDir,
        hints: [
          `${cfg.name}은 ${cfg.expectedDir === 'up' ? '상승' : cfg.expectedDir === 'down' ? '하락' : '횡보'} 반전과 관련이 있어요`,
          `${cfg.shape.slice(0, 30)}...`,
        ],
        choices: cfg.predChoices,
      },
    })

    // ── Step E: 정답 해설 ──────────────────────────────────
    steps.push({
      id:             `${cfg.key}-e-answer`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          cfg.signalSummary,
      body:           cfg.signalDetail,
      actionRequired: 'free',
    })

    // ── Step F: 결과 공개 (learningHighlightOnEnter로 줌 확장) ──
    steps.push({
      id:                       `${cfg.key}-f-result`,
      targetSelector:           '#chart-area',
      floatSide:                'bottom-right',
      position:                 'top',
      title:                    '실제 차트 결과를 확인해봐요.',
      body:                     resultContext,
      actionRequired:           'free',
      learningHighlightOnEnter: hlPost,   // 줌 확장 + 미래 공개
    })

    // ── Step G: 주의사항 ───────────────────────────────────
    steps.push({
      id:             `${cfg.key}-g-caution`,
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '기억하세요',
      body:           cfg.caution,
      tips: [
        '캔들 패턴은 확률을 높이는 신호예요',
        '단 하나의 패턴보다 여러 지표를 함께 보면 더 정확해요',
        '거래량도 함께 확인하면 신뢰도가 올라가요',
      ],
      actionRequired: 'free',
    })
  }

  // ── 종합 퀴즈 (5문항) ──────────────────────────────────────
  const QUIZ_INTRO: TutorialStep = {
    id:                       'candle-quiz-intro',
    targetSelector:           '#chart-area',
    floatSide:                'bottom-right',
    position:                 'top',
    title:                    '5개 패턴을 모두 배웠어요!',
    body:                     '이제 배운 내용을 확인해봐요. 5문항 퀴즈를 풀면 캔들 패턴 학습이 완료돼요.',
    actionRequired:           'free',
    learningHighlightOnEnter: null,   // 퀴즈 중 하이라이트 해제
  }
  steps.push(QUIZ_INTRO)

  const quizSteps: TutorialStep[] = [
    {
      id:             'candle-quiz-1',
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '퀴즈 1/5',
      body:           '망치형(Hammer)이 나타날 때 일어나는 일은?',
      actionRequired: 'judgment',
      judgment: {
        question:     '망치형의 핵심 특징은?',
        correctValue: 'price-recovered',
        choices: [
          { value: 'price-recovered', label: '주가가 내려갔다 강하게 회복됐어요', feedback: '맞아요! 아래 꼬리가 긴 이유가 바로 그거예요. 하락 시도를 매수자가 막아낸 거예요.' },
          { value: 'bearish',         label: '상승 후 매도자가 눌러버렸어요',      feedback: '그건 유성형(Shooting Star)이에요. 망치형은 하락 후 매수자가 반등시키는 패턴이에요.' },
          { value: 'no-meaning',      label: '꼬리가 생긴 것 뿐 의미 없어요',      feedback: '아래 꼬리의 길이가 매수 반발의 강도를 보여줘요. 의미 있는 신호예요.' },
        ],
      },
    },
    {
      id:             'candle-quiz-2',
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '퀴즈 2/5',
      body:           '상승 장악형(Bullish Engulfing)의 특징은?',
      actionRequired: 'judgment',
      judgment: {
        question:     '상승 장악형은 어떤 패턴인가요?',
        correctValue: 'green-covers-red',
        choices: [
          { value: 'green-covers-red', label: '빨간 캔들 뒤에 더 큰 초록 캔들이 나왔어요', feedback: '맞아요! 큰 초록 몸통이 빨간 몸통을 완전히 덮은 게 핵심이에요.' },
          { value: 'red-covers-green', label: '초록 캔들 뒤에 더 큰 빨간 캔들이 나왔어요',  feedback: '그건 하락 장악형(Bearish Engulfing)이에요. 상승 장악형은 반대예요.' },
          { value: 'single-candle',   label: '하나의 캔들만으로 이루어져요',              feedback: '상승 장악형은 두 개의 캔들이 만드는 패턴이에요.' },
        ],
      },
    },
    {
      id:             'candle-quiz-3',
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '퀴즈 3/5',
      body:           '도지(Doji)는 무엇을 나타내나요?',
      actionRequired: 'judgment',
      judgment: {
        question:     '도지의 의미는?',
        correctValue: 'indecision',
        choices: [
          { value: 'indecision',  label: '매수·매도 세력이 팽팽히 맞선 상태예요', feedback: '맞아요! 시가와 종가가 같다는 건 어느 쪽도 이기지 못했다는 뜻이에요.' },
          { value: 'strong-buy',  label: '강한 매수 신호예요',                    feedback: '강한 매수 신호는 장대양봉이에요. 도지는 방향 불확실이에요.' },
          { value: 'strong-sell', label: '강한 매도 신호예요',                    feedback: '도지는 매도 신호가 아니에요. 방향을 정하지 못한 상태예요.' },
        ],
      },
    },
    {
      id:             'candle-quiz-4',
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '퀴즈 4/5',
      body:           '유성형(Shooting Star)은 어떤 신호인가요?',
      actionRequired: 'judgment',
      judgment: {
        question:     '유성형이 상승 추세 끝에 나타나면?',
        correctValue: 'bearish-reversal',
        choices: [
          { value: 'bearish-reversal', label: '하락 반전 가능성을 경고하는 신호예요', feedback: '맞아요! 위 꼬리가 길다는 건 매수 시도가 막혔다는 뜻이에요. 하락에 대비해야 해요.' },
          { value: 'bullish',          label: '상승 가속 신호예요',                  feedback: '유성형은 매수 시도가 실패한 패턴이에요. 상승이 아닌 하락 반전 신호예요.' },
          { value: 'neutral',          label: '의미 없어요',                         feedback: '긴 위 꼬리는 강한 매도 압력의 증거예요. 하락 반전을 경계해야 해요.' },
        ],
      },
    },
    {
      id:             'candle-quiz-5',
      targetSelector: '#chart-area',
      floatSide:      'bottom-right',
      position:       'top',
      title:          '퀴즈 5/5',
      body:           '장대양봉의 특징은?',
      actionRequired: 'judgment',
      judgment: {
        question:     '장대양봉은 무엇을 나타내나요?',
        correctValue: 'strong-momentum',
        choices: [
          { value: 'strong-momentum', label: '강한 매수 모멘텀이 이어지는 신호예요', feedback: '맞아요! 처음부터 끝까지 매수가 압도적이었어요. 상승 에너지가 가득한 날이에요.' },
          { value: 'reversal',        label: '반전 신호예요',                        feedback: '장대양봉은 반전이 아닌 기존 상승 방향 강화 신호예요.' },
          { value: 'dont-buy',        label: '고점 신호라 매수하면 안 돼요',          feedback: '단기 조정은 있을 수 있지만, 신호 자체는 강한 매수 모멘텀이에요.' },
        ],
      },
    },
  ]

  steps.push(...quizSteps)

  // 학습 완료 마지막 단계
  steps.push({
    id:             'candle-complete',
    targetSelector: '#chart-area',
    floatSide:      'bottom-right',
    position:       'top',
    title:          '캔들 패턴 학습 완료!',
    body:           '5가지 패턴을 모두 배웠어요. 실제 차트를 볼 때 이 패턴들을 찾아보세요.',
    tips: [
      '패턴은 확률을 높이는 신호예요, 완벽한 예측이 아니에요',
      '거래량을 함께 확인하면 신뢰도가 올라가요',
      '여러 지표를 함께 보면 더 정확한 판단이 가능해요',
    ],
    actionRequired: 'free',
  })

  return steps
}
