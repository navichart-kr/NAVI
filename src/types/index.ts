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
}

export interface CandleData {
  time: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}
