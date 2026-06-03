/**
 * posthog-admin.ts — PostHog Query API 클라이언트 (서버 전용)
 *
 * 필요 환경변수:
 *   POSTHOG_PERSONAL_API_KEY  — Personal API Key (phx_...)
 *                               PostHog → Settings → Personal API Keys
 *   POSTHOG_PROJECT_ID        — Project 숫자 ID
 *                               PostHog URL: app.posthog.com/project/{ID}/...
 *
 * API: POST {host}/api/projects/{projectId}/query  (HogQL)
 */

const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_ID   = process.env.POSTHOG_PROJECT_ID
const HOST         = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export const IS_POSTHOG_CONFIGURED = !!(PERSONAL_KEY && PROJECT_ID)

/** HogQL 쿼리 실행 — 결과 rows 반환 */
export async function hogql(
  query: string,
  revalidate = 300,
): Promise<unknown[][] | null> {
  if (!IS_POSTHOG_CONFIGURED) return null

  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT_ID}/query/`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${PERSONAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      next: { revalidate },
    })
    if (!res.ok) return null
    const json = await res.json() as { results?: unknown[][] }
    return json.results ?? null
  } catch {
    return null
  }
}

/* ─── 대시보드용 쿼리 함수들 ─────────────────────────────── */

/** 주요 이벤트 카운트 (오늘 / 7일 / 30일) */
export async function fetchEventCounts() {
  const rows = await hogql(`
    SELECT
      event,
      countIf(toDate(timestamp) = today())                      AS today_cnt,
      countIf(timestamp >= now() - interval 7  day)             AS d7_cnt,
      countIf(timestamp >= now() - interval 30 day)             AS d30_cnt,
      uniqIf(distinct_id, timestamp >= now() - interval 30 day) AS d30_users
    FROM events
    WHERE event IN (
      '$pageview','tutorial_started','tutorial_completed','tutorial_exit',
      'tutorial_step_viewed','tutorial_judgment_answered',
      'comprehensive_test_answered',
      'advanced_learning_opened',
      'advanced_rsi_started','advanced_rsi_completed',
      'advanced_macd_started','advanced_macd_completed',
      'advanced_fibonacci_started','advanced_fibonacci_completed',
      'advanced_step_viewed',
      'challenge_started','challenge_completed',
      'challenge_prediction_submitted',
      'simulation_started','simulation_completed','simulation_retry',
      'indicator_enabled','drawing_tool_used',
      'landing_cta_clicked',
      'indicator_learn_more_opened','indicator_page_viewed','indicator_cta_clicked'
    )
      AND timestamp >= now() - interval 30 day
    GROUP BY event
  `)
  if (!rows) return null

  const map: Record<string, { today: number; d7: number; d30: number; users: number }> = {}
  for (const [event, today, d7, d30, users] of rows as [string,number,number,number,number][]) {
    map[event] = { today: today ?? 0, d7: d7 ?? 0, d30: d30 ?? 0, users: users ?? 0 }
  }
  return map
}

/** 방문자 일별 추이 (최근 N일, 기본 90일) */
export async function fetchDailyTrend(days = 90) {
  const rows = await hogql(`
    SELECT
      toDate(timestamp)                                            AS date,
      uniqIf(distinct_id, event = '$pageview')                    AS visitors,
      countIf(event = '$pageview')                                 AS pageviews,
      uniqIf(properties.$session_id, event = '$pageview')         AS sessions
    FROM events
    WHERE timestamp >= now() - interval ${days} day
    GROUP BY date
    ORDER BY date ASC
  `)
  if (!rows) return null
  return (rows as [string, number, number, number][]).map(([date, visitors, pageviews, sessions]) => ({
    date, visitors: visitors ?? 0, pageviews: pageviews ?? 0, sessions: sessions ?? 0,
  }))
}

/** 기초 튜토리얼 단계별 도달 수 */
export async function fetchTutorialStepCounts() {
  const rows = await hogql(`
    SELECT
      properties.step::integer AS step_num,
      uniq(distinct_id)        AS users
    FROM events
    WHERE event = 'tutorial_step_viewed'
      AND properties.tutorial = 'basic'
      AND timestamp >= now() - interval 30 day
    GROUP BY step_num
    ORDER BY step_num ASC
  `)
  if (!rows) return null
  return (rows as [number, number][]).map(([step, users]) => ({ step: step ?? 0, users: users ?? 0 }))
}

/** 심화 학습 단계별 도달 수 */
export async function fetchAdvancedStepCounts() {
  const rows = await hogql(`
    SELECT
      properties.topic         AS topic,
      properties.step::integer AS step_num,
      uniq(distinct_id)        AS users
    FROM events
    WHERE event = 'advanced_step_viewed'
      AND timestamp >= now() - interval 30 day
    GROUP BY topic, step_num
    ORDER BY topic, step_num ASC
  `)
  if (!rows) return null
  return (rows as [string, number, number][]).map(([topic, step, users]) => ({
    topic: topic ?? '', step: step ?? 0, users: users ?? 0,
  }))
}

/** 판단 퀴즈 정답률 (tutorial_judgment_answered) */
export async function fetchJudgmentAccuracy() {
  const rows = await hogql(`
    SELECT
      properties.step_id                              AS step_id,
      countIf(properties.is_correct = true)           AS correct,
      count()                                          AS total
    FROM events
    WHERE event = 'tutorial_judgment_answered'
      AND timestamp >= now() - interval 30 day
    GROUP BY step_id
    HAVING total > 0
    ORDER BY (correct * 100 / total) ASC
  `)
  if (!rows) return null
  return (rows as [string, number, number][]).map(([step_id, correct, total]) => ({
    step_id: step_id ?? '',
    correct:  correct ?? 0,
    total:    total   ?? 0,
    rate:     total > 0 ? Math.round((correct / total) * 100) : 0,
  }))
}

/** 종합 테스트 정답률 (4개 문항 모두 포함) */
export async function fetchTestAccuracy() {
  const rows = await hogql(`
    SELECT
      properties.question_id                          AS qid,
      countIf(properties.is_correct = true)           AS correct,
      count()                                          AS total
    FROM events
    WHERE event = 'comprehensive_test_answered'
      AND timestamp >= now() - interval 30 day
    GROUP BY qid
    HAVING total > 0
    ORDER BY (correct * 100 / total) ASC
  `)
  if (!rows) return null
  return (rows as [string, number, number][]).map(([qid, correct, total]) => ({
    qid:     qid     ?? '',
    correct: correct ?? 0,
    total:   total   ?? 0,
    rate:    total > 0 ? Math.round((correct / total) * 100) : 0,
  }))
}

/** 지표 사용 횟수 + 사용자 수 */
export async function fetchIndicatorUsage() {
  const rows = await hogql(`
    SELECT
      properties.indicator AS indicator,
      count()              AS cnt,
      uniq(distinct_id)    AS users
    FROM events
    WHERE event = 'indicator_enabled'
      AND timestamp >= now() - interval 30 day
    GROUP BY indicator
    ORDER BY cnt DESC
  `)
  if (!rows) return null
  return (rows as [string, number, number][]).map(([indicator, cnt, users]) => ({
    indicator: indicator ?? '', cnt: cnt ?? 0, users: users ?? 0,
  }))
}

/** 작도 도구 사용 횟수 + 사용자 수 */
export async function fetchDrawingUsage() {
  const rows = await hogql(`
    SELECT
      properties.tool   AS tool,
      count()           AS cnt,
      uniq(distinct_id) AS users
    FROM events
    WHERE event = 'drawing_tool_used'
      AND timestamp >= now() - interval 30 day
    GROUP BY tool
    ORDER BY cnt DESC
  `)
  if (!rows) return null
  return (rows as [string, number, number][]).map(([tool, cnt, users]) => ({
    tool: tool ?? '', cnt: cnt ?? 0, users: users ?? 0,
  }))
}

/** 지표 더 알아보기 분석 */
export async function fetchIndicatorLearnMore() {
  const rows = await hogql(`
    SELECT
      COALESCE(properties.indicator, '') AS indicator,
      countIf(event = 'indicator_learn_more_opened') AS learn_more,
      countIf(event = 'indicator_page_viewed')        AS page_viewed,
      countIf(event = 'indicator_cta_clicked')        AS cta_clicked
    FROM events
    WHERE event IN (
        'indicator_learn_more_opened',
        'indicator_page_viewed',
        'indicator_cta_clicked'
      )
      AND timestamp >= now() - interval 30 day
    GROUP BY indicator
    ORDER BY page_viewed DESC
  `)
  if (!rows) return null
  return (rows as [string, number, number, number][]).map(
    ([indicator, learn_more, page_viewed, cta_clicked]) => ({
      indicator:   indicator   ?? '',
      learn_more:  learn_more  ?? 0,
      page_viewed: page_viewed ?? 0,
      cta_clicked: cta_clicked ?? 0,
      return_rate: page_viewed > 0
        ? Math.round((cta_clicked / page_viewed) * 100)
        : 0,
    }),
  )
}

/** 챌린지 예측 방향 분포 */
export async function fetchChallengePrediction() {
  const rows = await hogql(`
    SELECT
      properties.direction AS direction,
      count()              AS cnt
    FROM events
    WHERE event = 'challenge_prediction_submitted'
      AND timestamp >= now() - interval 30 day
    GROUP BY direction
    ORDER BY cnt DESC
  `)
  if (!rows) return null
  return (rows as [string, number][]).map(([direction, cnt]) => ({
    direction: direction ?? '', cnt: cnt ?? 0,
  }))
}

/** 챌린지 평균 사용 지표 수 */
export async function fetchChallengeAvgIndicators() {
  const rows = await hogql(`
    SELECT avg(properties.active_indicators_count::float) AS avg_ind
    FROM events
    WHERE event = 'challenge_started'
      AND timestamp >= now() - interval 30 day
  `)
  if (!rows || !rows[0]) return null
  const val = (rows[0] as [number])[0]
  return val != null ? parseFloat(val.toFixed(1)) : null
}

/** 최근 이벤트 로그 */
export async function fetchRecentEvents(limit = 100) {
  const rows = await hogql(`
    SELECT
      timestamp,
      event,
      distinct_id,
      properties.step::string        AS step,
      properties.indicator           AS indicator,
      properties.tool                AS tool,
      properties.tutorial            AS tutorial,
      properties.is_correct::string  AS is_correct
    FROM events
    WHERE event NOT IN ('$pageleave', '$feature_flag_called', '$identify')
      AND timestamp >= now() - interval 1 day
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `, 60)
  if (!rows) return null
  return (rows as [string, string, string, string, string, string, string, string][])
    .map(([ts, event, uid, step, indicator, tool, tutorial, is_correct]) => ({
      ts:    ts    ?? '',
      event: event ?? '',
      uid:   (uid ?? '').slice(0, 8),
      props: [step, indicator, tool, tutorial, is_correct].filter(Boolean).join(', '),
    }))
}

/** 실전 챌린지 재도전 분포 */
export async function fetchRetryDistribution() {
  const rows = await hogql(`
    SELECT properties.retry_count::integer AS cnt, count() AS freq
    FROM events
    WHERE event = 'simulation_retry'
      AND timestamp >= now() - interval 30 day
    GROUP BY cnt
    ORDER BY cnt ASC
  `)
  if (!rows) return null
  return (rows as [number, number][]).map(([cnt, freq]) => ({ retry: cnt ?? 0, freq: freq ?? 0 }))
}
