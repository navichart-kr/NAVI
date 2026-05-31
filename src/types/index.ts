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
  icon:     string
  label:    string
  feedback: string
}

export interface TutorialStep {
  id:             string
  targetSelector: string
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

  /** 이 단계 진입 시 기존 작도 (추세선·피보나치) 를 모두 지운다 */
  clearDrawingsOnEnter?: boolean

  /**
   * 카드를 뷰포트 모서리에 고정 — 차트를 봐야 하는 단계에서 사용
   * 'bottom-right': 우하단 (데스크톱) / 하단 중앙 (모바일 < 768px)
   * targetSelector는 그대로 스포트라이트에 사용됨
   */
  floatSide?: 'bottom-right'

  /**
   * 모바일 전용 targetSelector (PC는 기존 targetSelector 사용)
   * 예: '#mobile-toolbar-analysis', '#mobile-indicator-links'
   */
  mobileTargetSelector?: string | null

  /** 모바일 전용 mission 텍스트 (설정 시 기존 mission 대체) */
  mobileMission?: string

  /** 모바일 전용 tips (설정 시 기존 tips 대체) */
  mobileTips?: string[]

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
}
