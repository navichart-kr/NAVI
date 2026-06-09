export type IndicatorSlug = 'rsi' | 'macd' | 'bollinger' | 'moving-average' | 'trendline' | 'fibonacci'

export interface Indicator {
  slug: IndicatorSlug
  name: string
  oneLineSummary: string
  description: string
  howToRead: string[]
  tips?: string[]
  caution?: string
  difficulty: 1 | 2 | 3
  exampleImageUrl?: string
}

export interface JudgmentChoice {
  value:    string
  icon?:    string
  label:    string
  feedback: string
}

export interface TutorialStep {
  id:             string
  /**
   * spotlight 대상 CSS 셀렉터.
   * null 로 설정하면 dim overlay / ring 이 모두 렌더링되지 않는다.
   * (overlayPosition 과 함께 쓰면 카드만 고정 배치하고 spotlight 없앨 수 있음)
   */
  targetSelector: string | null
  title:          string
  body:           string
  tips?:          string[]
  mission?:       string
  position:       'top' | 'bottom' | 'left' | 'right'

  /** 'candle-click'        : 사용자가 캔들을 직접 클릭해야 진행
   *  'indicator-toggle'    : 특정 지표 버튼을 켜야 진행
   *  'judgment'            : 3지선다 선택을 해야 진행
   *  'free'                : 행동 불필요 (읽고 다음으로)
   *  'comprehensive-test'  : 4문항 종합 테스트 */
  actionRequired?: 'candle-click' | 'indicator-toggle' | 'judgment' | 'free' | 'comprehensive-test'
  indicatorKey?:   string
  judgment?: {
    question:      string
    choices:       JudgmentChoice[]
    /** 정답 choice.value (레슨 전용 — 없으면 어느 선택도 허용) */
    correctValue?: string
    /** 오답 시 표시할 힌트 목록 */
    hints?:        string[]
  }
  completionMessage?: string

  // ── 자동 상태 관리 ────────────────────────────────────
  /** 이 단계 진입 시 자동으로 끌 지표 목록 */
  clearIndicatorsOnEnter?: IndicatorSlug[]
  /** 이 단계 진입 시 자동으로 켤 지표 목록 */
  activateIndicatorsOnEnter?: IndicatorSlug[]
  /** 이 단계 진입 시 차트를 마지막 N봉이 보이도록 줌 */
  focusBarsFromEnd?: number

  /**
   * 이 단계 진입 시 특정 날짜 구간으로 차트를 줌
   * focusBarsFromEnd 보다 우선 적용된다.
   * 피보나치 레슨처럼 과거 특정 구간을 보여줘야 할 때 사용.
   */
  focusDateRange?: { from: string; to: string }

  /** 이 단계 진입 시 기존 작도 (추세선·피보나치) 를 모두 지운다 */
  clearDrawingsOnEnter?: boolean

  /**
   * 이 단계 진입 시 드로잉 툴을 자동으로 활성화
   * 단계 이동 시 항상 'none'으로 초기화된 후 이 값이 적용된다
   */
  activateDrawingToolOnEnter?: 'fibonacci' | 'trendline'

  /**
   * 모바일 전용 targetSelector (PC는 기존 targetSelector 사용)
   * 예: '#mobile-toolbar-analysis', '#mobile-indicator-links'
   */
  mobileTargetSelector?: string | null

  /**
   * 단계 완료(지표 토글/판단 후 피드백 모드) 시 spotlight을 이동할 selector
   * 예: indicator-toggle 후 차트 영역으로 이동
   */
  completionTargetSelector?: string

  /** 모바일에서 단계 완료 시 spotlight selector (미설정 시 completionTargetSelector 사용) */
  mobileCompletionTargetSelector?: string

  /** 모바일 전용 mission 텍스트 (설정 시 기존 mission 대체) */
  mobileMission?: string

  /** 모바일 전용 tips (설정 시 기존 tips 대체) */
  mobileTips?: string[]

  /**
   * 이 단계 진입 시 차트 학습 하이라이트를 변경
   *   undefined  → 변경 없음 (이전 상태 유지)
   *   null       → 하이라이트 해제
   *   LearningHighlight → 해당 설정으로 업데이트 (줌 + 캔들 강조)
   * 캔들·거래량 학습 단계에서 사용.
   */
  learningHighlightOnEnter?: LearningHighlight | null

  /**
   * PC 플로팅 카드를 뷰포트 고정 위치에 표시
   * 설정 시 calcCardPos() 자동 배치 계산을 무시하고 항상 지정 위치에 렌더링된다.
   * 피보나치 레슨처럼 차트가 화면 전체를 차지해 카드 위치가 불안정할 때 사용.
   */
  overlayPosition?: 'top-right' | 'bottom-right' | 'top-center' | 'bottom-center'

  /**
   * 피보나치 작도 가이드 — 저점·고점 위치에 펄스 마커 표시
   * ChartContainer 가 priceToCoordinate + timeToCoordinate 로 위치 계산 후
   * HTML 오버레이로 렌더링한다.
   */
  fibGuide?: {
    lowDate:   string   // 'YYYY-MM-DD'
    lowPrice:  number
    highDate:  string
    highPrice: number
  }
}

export interface CandleData {
  time: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
  volume?: number  // 거래량 (거래량 학습 활성 시 사용)
}

/**
 * LearningHighlight — 캔들/거래량 학습 시 차트 줌 + 캔들 강조 정보
 * chartStore 와 TutorialStep 양쪽에서 참조하므로 types에 정의
 */
export interface LearningHighlight {
  candleIndex:          number          // 패턴 주 캔들 인덱스
  prevCandleIndex?:     number          // 이전 캔들 (장악형 등 2캔들 패턴)
  windowFrom:           number          // 가시 범위 시작 (logical index)
  windowTo:             number          // 가시 범위 끝
  outcome:              'up' | 'down' | 'sideways'
  showResult:           boolean         // 결과(미래) 구간 공개 여부
  type:                 'candle' | 'volume'
  volumeHighlightIndex?: number         // 거래량 학습 시 강조할 거래량 바 인덱스
}
