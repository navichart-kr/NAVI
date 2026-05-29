export type IndicatorSlug = 'rsi' | 'macd' | 'bollinger' | 'moving-average' | 'trendline' | 'fibonacci'

export interface Indicator {
  slug: IndicatorSlug
  name: string
  oneLineSummary: string
  description: string
  howToRead: string[]
  tips?: string[]        // 실전 활용 팁
  caution?: string       // 주의할 점
  difficulty: 1 | 2 | 3  // 1=쉬움, 3=어려움
  exampleImageUrl?: string
}

export interface JudgmentChoice {
  value:    string
  icon:     string
  label:    string
  feedback: string  // 선택 후 보여줄 피드백 문장
}

export interface TutorialStep {
  id:             string
  targetSelector: string
  title:          string
  body:           string
  tips?:          string[]
  mission?:       string
  position:       'top' | 'bottom' | 'left' | 'right'

  // ── 인터랙티브 필드 ──────────────────────────────────
  /** 'candle-click'     : 사용자가 캔들을 직접 클릭해야 진행
   *  'indicator-toggle' : 특정 지표 버튼을 켜야 진행
   *  'judgment'         : 3지선다 선택을 해야 진행
   *  'free'             : 행동 불필요 (읽고 다음으로) */
  actionRequired?: 'candle-click' | 'indicator-toggle' | 'judgment' | 'free'
  indicatorKey?:   string          // actionRequired === 'indicator-toggle' 일 때
  judgment?: {
    question: string
    choices:  JudgmentChoice[]
  }
  completionMessage?: string       // 행동 완료 후 표시할 메시지

  // ── 자동 상태 관리 ────────────────────────────────────
  /** 이 단계 진입 시 자동으로 끌 지표 목록 */
  clearIndicatorsOnEnter?: IndicatorSlug[]
  /** 이 단계 진입 시 차트를 마지막 N봉이 보이도록 줌 */
  focusBarsFromEnd?: number
}

export interface CandleData {
  time: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}
