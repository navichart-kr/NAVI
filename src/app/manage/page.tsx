import {
  fetchEventCounts,
  fetchDailyTrend,
  fetchTutorialStepCounts,
  fetchAdvancedStepCounts,
  fetchJudgmentAccuracy,
  fetchTestAccuracy,
  fetchIndicatorUsage,
  fetchDrawingUsage,
  fetchRecentEvents,
  fetchRetryDistribution,
  fetchIndicatorLearnMore,
  fetchChallengePrediction,
  fetchChallengeAvgIndicators,
  fetchCandleLearningStats,
  fetchVolumeLearningStats,
  IS_POSTHOG_CONFIGURED,
} from '@/lib/posthog-admin'
import { KPICard }         from '@/components/manage/KPICard'
import { SectionCard, NotConfigured } from '@/components/manage/SectionCard'
import { HBarChart }       from '@/components/manage/HBarChart'
import { FunnelChart }     from '@/components/manage/FunnelChart'
import { StepDropoff }     from '@/components/manage/StepDropoff'
import { LineChart }       from '@/components/manage/LineChart'
import { EventLog }        from '@/components/manage/EventLog'
import { InsightCards, type Insight } from '@/components/manage/InsightCards'
import { IndicatorLearnMore } from '@/components/manage/IndicatorLearnMore'

export const revalidate = 300

/* ─── 헬퍼 ────────────────────────────────────────────────── */
type EventMap = Record<string, { today: number; d7: number; d30: number; users: number }>

function cnt(map: EventMap | null, key: string, period: 'today' | 'd7' | 'd30' = 'd30') {
  return map?.[key]?.[period] ?? 0
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}
function fmtPct(n: number) { return `${n}%` }

/* ─── PostHog 미설정 배너 ─────────────────────────────────── */
function ConfigBanner() {
  return (
    <div className="bg-navi-warning/[0.08] border border-navi-warning/25 rounded-2xl p-4 mb-2">
      <p className="text-[13px] font-bold text-navi-text mb-1">📊 PostHog API 미연결 상태</p>
      <p className="text-[12px] text-navi-secondary leading-relaxed mb-3">
        실제 데이터를 보려면 아래 환경변수를 Vercel에 추가하고 재배포하세요.
      </p>
      <div className="bg-navi-surface rounded-xl p-3 font-mono text-[11px] text-navi-text space-y-1">
        <p>
          <span className="text-navi-action">POSTHOG_PERSONAL_API_KEY</span>
          =phx_...{'  '}
          <span className="text-navi-muted"># PostHog → Settings → Personal API Keys</span>
        </p>
        <p>
          <span className="text-navi-action">POSTHOG_PROJECT_ID</span>
          =12345{'          '}
          <span className="text-navi-muted"># PostHog URL의 숫자 프로젝트 ID</span>
        </p>
        <p>
          <span className="text-navi-action">ADMIN_PASSWORD</span>
          =your_password{'      '}
          <span className="text-navi-muted"># 이 페이지 로그인 비밀번호</span>
        </p>
      </div>
    </div>
  )
}

/* ─── 섹션 제목 ────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-navi-muted mb-2">
      {children}
    </p>
  )
}

/* ─── 퀴즈 레이블 매핑 ────────────────────────────────────── */
const JUDGMENT_LABELS: Record<string, string> = {
  'ma-judgment':   'MA 방향 퀴즈',
  'rsi-judgment':  'RSI 위치 퀴즈',
  'macd-judgment': 'MACD 위치 퀴즈',
  'bb-judgment':   'BB 간격 퀴즈',
}
const TEST_LABELS: Record<string, string> = {
  trend:      '추세 이해',
  rsi:        'RSI 해석',
  macd:       'MACD 해석',
  prediction: '예측 종합',
}

/* ═══════════════════════════════════════════════════════════ */
export default async function ManagePage() {

  /* ── 전체 데이터 병렬 fetch ─────────────────────────────── */
  const [
    events, trend, steps, advSteps,
    judgment, testAcc,
    indicators, drawings,
    recentEvt, retry,
    learnMore, prediction, avgInd,
    candleStats, volumeStats,
  ] = await Promise.all([
    fetchEventCounts(),
    fetchDailyTrend(90),
    fetchTutorialStepCounts(),
    fetchAdvancedStepCounts(),
    fetchJudgmentAccuracy(),
    fetchTestAccuracy(),
    fetchIndicatorUsage(),
    fetchDrawingUsage(),
    fetchRecentEvents(100),
    fetchRetryDistribution(),
    fetchIndicatorLearnMore(),
    fetchChallengePrediction(),
    fetchChallengeAvgIndicators(),
    fetchCandleLearningStats(),
    fetchVolumeLearningStats(),
  ])

  /* ── 방문 KPI ──────────────────────────────────────────── */
  const pvToday     = cnt(events, '$pageview', 'today')
  const visitors7   = events?.['$pageview']?.d7   ?? 0
  const visitors30  = events?.['$pageview']?.d30  ?? 0
  const pv30        = cnt(events, '$pageview')

  /* ── 전환 KPI ──────────────────────────────────────────── */
  const tutStart30  = cnt(events, 'tutorial_started')
  const tutDone30   = cnt(events, 'tutorial_completed')
  const tutExit30   = cnt(events, 'tutorial_exit')
  const tutStartRate = pct(tutStart30, visitors30)
  const tutDoneRate  = pct(tutDone30,  tutStart30)

  const advStart30  = cnt(events, 'advanced_rsi_started')
                    + cnt(events, 'advanced_macd_started')
                    + cnt(events, 'advanced_fibonacci_started')
  const advDone30   = cnt(events, 'advanced_rsi_completed')
                    + cnt(events, 'advanced_macd_completed')
                    + cnt(events, 'advanced_fibonacci_completed')
  const advRate     = pct(advDone30, advStart30)
  const advEntryRate = pct(advStart30, tutDone30)

  const chalStart30 = cnt(events, 'challenge_started')
  const chalDone30  = cnt(events, 'challenge_completed')
  const chalRate    = pct(chalDone30, chalStart30)
  const chalEntryRate = pct(chalStart30, tutStart30)

  const retryTotal  = cnt(events, 'simulation_retry')
  const retryRate   = pct(retryTotal, chalStart30)

  /* ── 평균 퀴즈 정답률 ──────────────────────────────────── */
  const allRates = [
    ...(judgment ?? []).map(j => j.rate),
    ...(testAcc  ?? []).map(t => t.rate),
  ]
  const avgQuizRate = allRates.length > 0
    ? Math.round(allRates.reduce((a, b) => a + b, 0) / allRates.length)
    : 0

  /* ── 캔들/거래량 학습 KPI ───────────────────────────── */
  const candleStart30  = cnt(events, 'candle_learning_started')
  const candleDone30   = cnt(events, 'candle_learning_completed')
  const candleRate30   = pct(candleDone30, candleStart30)
  const volumeStart30  = cnt(events, 'volume_learning_started')
  const volumeDone30   = cnt(events, 'volume_learning_completed')
  const volumeRate30   = pct(volumeDone30, volumeStart30)

  const CANDLE_PATTERN_LABELS: Record<string, string> = {
    doji:               '도지',
    hammer:             '망치형',
    'inverted-hammer':  '역망치형',
    'bullish-engulfing':'상승 장악형',
    'bearish-engulfing':'하락 장악형',
  }
  const VOLUME_TOPIC_LABELS: Record<string, string> = {
    intro:       '거래량이란?',
    'up-surge':  '상승+거래량↑',
    'down-surge':'하락+거래량↑',
    divergence:  '거래량 다이버전스',
    quiz:        '실전 문제',
  }

  // 가장 어려운 캔들 패턴 (정답률 최저)
  const hardestCandle = candleStats?.filter(s => s.completed > 0).length
    ? candleStats!.slice().sort((a, b) => a.accuracy - b.accuracy)[0]
    : null

  // 가장 이탈 많은 거래량 주제 (완료율 최저, started > 0)
  const worstVolume = volumeStats?.filter(v => v.started > 0).length
    ? volumeStats!.slice().sort((a, b) => a.completeRate - b.completeRate)[0]
    : null

  /* ── AI 인사이트 계산 ──────────────────────────────────── */
  const hardestQuiz   = judgment?.length
    ? judgment[0]   // 이미 정답률 낮은 순 정렬
    : null
  const hardestTest   = testAcc?.length
    ? testAcc[0]
    : null

  // 가장 이탈률 높은 단계
  let worstStep: { name: string; dropPct: number } | null = null
  if (steps && steps.length > 1) {
    let maxDrop = 0
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].users
      const curr = steps[i].users
      const drop = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0
      if (drop > maxDrop) {
        maxDrop = drop
        const NAMES: Record<number, string> = {
          1:'캔들 클릭',2:'추세선 소개',3:'MA 활성화',4:'MA 방향 퀴즈',
          5:'RSI 활성화',6:'RSI 위치 퀴즈',7:'MACD 활성화',8:'MACD 위치 퀴즈',
          9:'BB 활성화',10:'BB 간격 퀴즈',11:'피보나치 소개',12:'심화학습 안내',
          13:'종합 테스트',14:'튜토리얼 완료',15:'챌린지 소개',16:'기초 과정 완료',
        }
        worstStep = {
          name:    NAMES[steps[i].step] ?? `Step ${steps[i].step}`,
          dropPct: maxDrop,
        }
      }
    }
  }

  // 가장 인기 있는 지표
  const topIndicator = indicators?.length ? indicators[0] : null

  // 가장 완료율 높은 심화학습
  const TOPICS = ['rsi', 'macd', 'fibonacci'] as const
  const advTopics = TOPICS.map(topic => ({
    topic,
    label: topic === 'rsi' ? 'RSI' : topic === 'macd' ? 'MACD' : '피보나치',
    start: cnt(events, `advanced_${topic}_started`),
    done:  cnt(events, `advanced_${topic}_completed`),
  })).map(t => ({ ...t, rate: pct(t.done, t.start) }))
  const bestAdv = advTopics.reduce(
    (best, t) => (t.rate > best.rate ? t : best),
    { label: '–', rate: 0 },
  )

  const insights: Insight[] = [
    {
      icon: '🧩',
      title: '가장 어려운 퀴즈',
      value: hardestQuiz
        ? (JUDGMENT_LABELS[hardestQuiz.step_id] ?? hardestQuiz.step_id)
        : '–',
      sub:   hardestQuiz ? `정답률 ${hardestQuiz.rate}% (${hardestQuiz.total}회)` : '데이터 없음',
      alert: !!(hardestQuiz && hardestQuiz.rate < 40),
    },
    {
      icon: '🚨',
      title: '최고 이탈 단계',
      value: worstStep ? worstStep.name : '–',
      sub:   worstStep ? `이전 대비 ${worstStep.dropPct}% 이탈` : '데이터 없음',
      alert: !!(worstStep && worstStep.dropPct > 30),
    },
    {
      icon: '📊',
      title: '인기 지표',
      value: topIndicator
        ? topIndicator.indicator.toUpperCase()
        : '–',
      sub:   topIndicator ? `${topIndicator.cnt.toLocaleString()}회 활성화` : '데이터 없음',
      good:  true,
    },
    {
      icon: '🎓',
      title: '완료율 최고 심화',
      value: bestAdv.rate > 0 ? bestAdv.label : '–',
      sub:   bestAdv.rate > 0 ? `완료율 ${bestAdv.rate}%` : '데이터 없음',
      good:  bestAdv.rate >= 60,
    },
    {
      icon: '🎯',
      title: '챌린지 완료율',
      value: chalStart30 > 0 ? fmtPct(chalRate) : '–',
      sub:   chalStart30 > 0
        ? `${chalStart30}명 시작 → ${chalDone30}명 완료`
        : '데이터 없음',
      good:  chalRate >= 50,
      alert: chalRate > 0 && chalRate < 30,
    },
    {
      icon: '🕯️',
      title: '어려운 캔들',
      value: hardestCandle
        ? (CANDLE_PATTERN_LABELS[hardestCandle.pattern] ?? hardestCandle.pattern)
        : '–',
      sub:   hardestCandle
        ? `정답률 ${hardestCandle.accuracy}%`
        : '데이터 없음',
      alert: !!(hardestCandle && hardestCandle.accuracy < 35),
    },
    {
      icon: '📊',
      title: '거래량 이탈 주제',
      value: worstVolume
        ? (VOLUME_TOPIC_LABELS[worstVolume.topic] ?? worstVolume.topic)
        : '–',
      sub:   worstVolume
        ? `완료율 ${worstVolume.completeRate}%`
        : '데이터 없음',
      alert: !!(worstVolume && worstVolume.completeRate < 30),
    },
  ]

  /* ── 퍼널 단계 ────────────────────────────────────────── */
  const indPageViews = cnt(events, 'indicator_page_viewed')
  const funnelSteps = [
    {
      label:       '홈 방문',
      desc:        '서비스 첫 진입',
      event:       '$pageview',
      count:       visitors30,
      convTooltip: '최근 30일 유니크 방문자 수\n(uniq distinct_id)',
    },
    {
      label:       '튜토리얼 시작',
      desc:        '기초 학습 시작',
      event:       'tutorial_started',
      count:       tutStart30,
      convTooltip: `tutorial_started / 홈 방문자 × 100\n= ${tutStart30} / ${visitors30} × 100`,
    },
    {
      label:       '튜토리얼 완료',
      desc:        '16단계 기초 과정 완료',
      event:       'tutorial_completed',
      count:       tutDone30,
      convTooltip: `tutorial_completed / tutorial_started × 100\n= ${tutDone30} / ${tutStart30} × 100`,
    },
    {
      label:       '심화학습 진입',
      desc:        'RSI/MACD/피보나치 학습 진입',
      event:       'advanced_*_started',
      count:       advStart30,
      convTooltip: `advanced_*_started 합산 / tutorial_completed × 100\n= ${advStart30} / ${tutDone30} × 100`,
    },
    {
      label:       '지표 상세 페이지',
      desc:        '지표 설명 콘텐츠 열람',
      event:       'indicator_page_viewed',
      count:       indPageViews,
      convTooltip: `indicator_page_viewed / 심화학습 진입 × 100\n= ${indPageViews} / ${advStart30} × 100`,
    },
    {
      label:       '챌린지 진입',
      desc:        '실전 예측 시작',
      event:       'challenge_started',
      count:       chalStart30,
      convTooltip: `challenge_started / tutorial_started × 100\n= ${chalStart30} / ${tutStart30} × 100`,
    },
    {
      label:       '챌린지 완료',
      desc:        '결과 확인 완료',
      event:       'challenge_completed',
      count:       chalDone30,
      convTooltip: `challenge_completed / challenge_started × 100\n= ${chalDone30} / ${chalStart30} × 100`,
    },
  ]

  /* ── 심화학습 단계별 그룹 ────────────────────────────── */
  const advByTopic = TOPICS.map(topic => ({
    ...advTopics.find(t => t.topic === topic)!,
    steps: (advSteps ?? []).filter(s => s.topic === topic),
  }))

  /* ── 재도전 요약 ─────────────────────────────────────── */
  const retryTotal2 = retry?.reduce((s, r) => s + r.freq, 0) ?? 0
  const avgRetry    = retry && retryTotal2 > 0
    ? (retry.reduce((s, r) => s + r.retry * r.freq, 0) / retryTotal2).toFixed(1)
    : '–'

  // 1회 / 2회이상 / 3회이상 / 5회이상
  const retryBuckets = retry ? [
    { label: '1회 플레이',  freq: retry.find(r => r.retry === 0)?.freq ?? 0 },
    { label: '2회 이상',   freq: retry.filter(r => r.retry >= 1).reduce((s, r) => s + r.freq, 0) },
    { label: '3회 이상',   freq: retry.filter(r => r.retry >= 2).reduce((s, r) => s + r.freq, 0) },
    { label: '5회 이상',   freq: retry.filter(r => r.retry >= 4).reduce((s, r) => s + r.freq, 0) },
  ] : []

  /* ── 예측 분포 레이블 ────────────────────────────────── */
  const predLabels: Record<string, string> = { up: '상승 📈', down: '하락 📉', sideways: '횡보 ➡', bullish:'상승', bearish:'하락', neutral:'횡보' }

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 pb-16">

      {/* PostHog 미설정 배너 */}
      {!IS_POSTHOG_CONFIGURED && <ConfigBanner />}

      {/* ══════════════════════════════════════
          0. AI 인사이트 카드
      ══════════════════════════════════════ */}
      <section id="insights">
        <SectionTitle>핵심 인사이트 — 자동 요약</SectionTitle>
        <InsightCards insights={insights} />
      </section>

      {/* ══════════════════════════════════════
          1. KPI — 3개 그룹
      ══════════════════════════════════════ */}
      <section id="kpi" className="space-y-4">

        {/* 방문 */}
        <div>
          <SectionTitle>방문 지표 — 최근 30일</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard
              label="오늘 페이지뷰"
              value={pvToday.toLocaleString()}
              sub="오늘 기준"
              accent
              tooltip="오늘(자정~현재) 발생한 $pageview 이벤트 수"
            />
            <KPICard
              label="7일 방문자"
              value={visitors7.toLocaleString()}
              sub="유니크 사용자"
              tooltip="최근 7일 $pageview 이벤트 기준 uniq(distinct_id)"
            />
            <KPICard
              label="30일 방문자"
              value={visitors30.toLocaleString()}
              sub="유니크 사용자"
              tooltip="최근 30일 $pageview 이벤트 기준 uniq(distinct_id)"
            />
            <KPICard
              label="30일 페이지뷰"
              value={pv30.toLocaleString()}
              sub="총 페이지뷰"
              tooltip="최근 30일 $pageview 이벤트 총 발생 수"
            />
          </div>
        </div>

        {/* 전환 */}
        <div>
          <SectionTitle>전환 지표 — 최근 30일</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="튜토리얼 시작률"
              value={fmtPct(tutStartRate)}
              sub={`방문자 ${visitors30}명 중`}
              accent={tutStartRate >= 20}
              alert={tutStartRate > 0 && tutStartRate < 10}
              pct={tutStartRate}
              tooltip={`tutorial_started / 30일 방문자 × 100\n= ${tutStart30} / ${visitors30} × 100`}
            />
            <KPICard
              label="튜토리얼 완료율"
              value={fmtPct(tutDoneRate)}
              sub={`${tutStart30} → ${tutDone30}명`}
              accent={tutDoneRate >= 50}
              alert={tutDoneRate > 0 && tutDoneRate < 30}
              pct={tutDoneRate}
              tooltip={`tutorial_completed / tutorial_started × 100\n= ${tutDone30} / ${tutStart30} × 100`}
            />
            <KPICard
              label="심화학습 진입률"
              value={fmtPct(advEntryRate)}
              sub={`튜토리얼 완료 ${tutDone30}명 중`}
              accent={advEntryRate >= 30}
              pct={advEntryRate}
              tooltip={`advanced_*_started 합산 / tutorial_completed × 100\n= ${advStart30} / ${tutDone30} × 100`}
            />
            <KPICard
              label="챌린지 진입률"
              value={fmtPct(chalEntryRate)}
              sub={`튜토리얼 시작 ${tutStart30}명 중`}
              accent={chalEntryRate >= 20}
              pct={chalEntryRate}
              tooltip={`challenge_started / tutorial_started × 100\n= ${chalStart30} / ${tutStart30} × 100`}
            />
            <KPICard
              label="챌린지 완료율"
              value={fmtPct(chalRate)}
              sub={`${chalStart30} → ${chalDone30}명`}
              accent={chalRate >= 50}
              alert={chalRate > 0 && chalRate < 30}
              pct={chalRate}
              tooltip={`challenge_completed / challenge_started × 100\n= ${chalDone30} / ${chalStart30} × 100`}
            />
            <KPICard
              label="재도전율"
              value={fmtPct(retryRate)}
              sub={`${retryTotal}회 재도전`}
              accent={retryRate >= 30}
              pct={retryRate}
              tooltip={`simulation_retry 총 횟수 / challenge_started × 100\n= ${retryTotal} / ${chalStart30} × 100`}
            />
          </div>
        </div>

        {/* 학습 성과 */}
        <div>
          <SectionTitle>학습 성과 지표 — 최근 30일</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard
              label="평균 퀴즈 정답률"
              value={avgQuizRate > 0 ? fmtPct(avgQuizRate) : '–'}
              sub="판단형 + 종합 테스트 평균"
              accent={avgQuizRate >= 60}
              alert={avgQuizRate > 0 && avgQuizRate < 40}
              pct={avgQuizRate}
              tooltip="(판단형 퀴즈 4문항 + 종합 테스트 4문항) 정답률의 단순 평균"
            />
            <KPICard
              label="심화학습 완료율"
              value={fmtPct(advRate)}
              sub={`${advStart30} → ${advDone30}명`}
              accent={advRate >= 50}
              alert={advRate > 0 && advRate < 25}
              pct={advRate}
              tooltip={`3개 심화학습(RSI+MACD+피보나치) 완료 합산 / 시작 합산 × 100\n= ${advDone30} / ${advStart30} × 100`}
            />
            <KPICard
              label="튜토리얼 이탈 횟수"
              value={tutExit30.toLocaleString()}
              sub="30일 tutorial_exit"
              alert={tutExit30 > tutDone30}
              tooltip="tutorial_exit 이벤트 발생 수 (완료 전 튜토리얼 닫기)"
            />
            <KPICard
              label="지표 활성화"
              value={cnt(events, 'indicator_enabled').toLocaleString()}
              sub="indicator_enabled 30일"
              tooltip="indicator_enabled 이벤트 총 발생 수 (MA/RSI/MACD/BB 합산)"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. 방문자 추이 그래프
      ══════════════════════════════════════ */}
      <SectionCard
        id="trend"
        title="방문자 추이"
        sub="최근 7일 / 30일 / 90일 선택 · 방문자(파랑) + 페이지뷰(민트) · 호버 툴팁"
      >
        {trend
          ? <LineChart data={trend} />
          : <NotConfigured message="PostHog API 연결 후 표시됩니다." />
        }
      </SectionCard>

      {/* ══════════════════════════════════════
          3. 전체 사용자 여정 퍼널
      ══════════════════════════════════════ */}
      <SectionCard
        id="funnel"
        title="전체 사용자 여정 퍼널"
        sub="홈 방문 → 챌린지 완료 · 최근 30일 · 각 단계 이탈 설명 포함"
      >
        {events
          ? <FunnelChart steps={funnelSteps} />
          : <NotConfigured message="PostHog API 연결 후 표시됩니다." />
        }
      </SectionCard>

      {/* ══════════════════════════════════════
          4. 기초 튜토리얼 16단계 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="steps"
        title="기초 튜토리얼 16단계 분석"
        sub="tutorial_step_viewed · 최근 30일 · 빨간 강조 = 이전 단계 대비 30% 이상 이탈"
      >
        {steps
          ? <StepDropoff steps={steps} type="basic" />
          : <NotConfigured message="PostHog API 연결 후 표시됩니다." />
        }
      </SectionCard>

      {/* ══════════════════════════════════════
          5 & 6. 퀴즈 분석 (판단형 + 종합 테스트)
      ══════════════════════════════════════ */}
      <SectionCard
        id="quiz"
        title="튜토리얼 퀴즈 정답률 분석"
        sub="tutorial_judgment_answered + comprehensive_test_answered · 정답률 낮은 순"
      >
        {judgment || testAcc ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* 판단형 퀴즈 */}
            <div>
              <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                판단형 퀴즈 (4문항)
              </p>
              {judgment && judgment.length > 0 ? (
                <div className="space-y-2">
                  {judgment.map(j => {
                    const label = JUDGMENT_LABELS[j.step_id] ?? j.step_id
                    const isAlert = j.rate < 50
                    return (
                      <div key={j.step_id} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[12px] font-medium ${isAlert ? 'text-navi-danger' : 'text-navi-text'}`}>
                            {label}
                          </span>
                          <span className={`text-[13px] font-bold ${isAlert ? 'text-navi-danger' : 'text-[#34D399]'}`}>
                            {j.rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-navi-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isAlert ? 'bg-navi-danger/70' : 'bg-[#34D399]/70'}`}
                              style={{ width: `${j.rate}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-navi-muted w-12 text-right shrink-0">
                            {j.total}회 응답
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-[12px] text-navi-muted">데이터 없음</p>}
            </div>

            {/* 종합 테스트 */}
            <div>
              <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                종합 테스트 (4문항)
              </p>
              {testAcc && testAcc.length > 0 ? (
                <div className="space-y-2">
                  {testAcc.map(t => {
                    const label = TEST_LABELS[t.qid] ?? t.qid
                    const isAlert = t.rate < 50
                    return (
                      <div key={t.qid} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[12px] font-medium ${isAlert ? 'text-navi-danger' : 'text-navi-text'}`}>
                            {label}
                          </span>
                          <span className={`text-[13px] font-bold ${isAlert ? 'text-navi-danger' : 'text-[#34D399]'}`}>
                            {t.rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-navi-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isAlert ? 'bg-navi-danger/70' : 'bg-[#34D399]/70'}`}
                              style={{ width: `${t.rate}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-navi-muted w-12 text-right shrink-0">
                            {t.total}회 응답
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {/* 전체 평균 */}
                  {testAcc.length > 0 && (
                    <div className="pt-2 border-t border-navi-border/40 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.06em]">
                        전체 평균
                      </span>
                      <span className="text-[14px] font-black text-navi-action">
                        {Math.round(testAcc.reduce((s, t) => s + t.rate, 0) / testAcc.length)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : <p className="text-[12px] text-navi-muted">데이터 없음</p>}
            </div>
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          7. 심화 학습 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="advanced"
        title="심화학습 분석"
        sub="RSI · MACD · 피보나치 · 시작 / 완료 / 완료율 + 단계별 이탈"
      >
        {events ? (
          <div className="space-y-6">
            {/* 과목별 KPI 카드 */}
            <div className="grid grid-cols-3 gap-3">
              {advByTopic.map(t => (
                <div key={t.topic} className="bg-navi-surface2 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navi-muted mb-2">
                    {t.label} 심화
                  </p>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className={`text-[22px] font-black leading-none ${
                      t.rate >= 60 ? 'text-[#34D399]' : t.rate > 0 && t.rate < 30 ? 'text-navi-danger' : 'text-navi-text'
                    }`}>
                      {t.rate}%
                    </span>
                    <span className="text-[11px] text-navi-muted pb-0.5">완료율</span>
                  </div>
                  <p className="text-[11px] text-navi-secondary">
                    {t.start.toLocaleString()}명 시작 · {t.done.toLocaleString()}명 완료
                  </p>
                  <div className="mt-2 h-1 bg-navi-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${t.rate >= 60 ? 'bg-[#34D399]' : 'bg-navi-action'}`}
                      style={{ width: `${t.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 단계별 이탈 */}
            {advByTopic.map(t => t.steps.length > 0 && (
              <div key={t.topic}>
                <StepDropoff
                  steps={t.steps}
                  title={`${t.label} 심화 — 단계별 이탈`}
                  type="advanced"
                />
              </div>
            ))}
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          8. 지표 더 알아보기 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="learnmore"
        title="지표 더 알아보기 분석"
        sub="indicator_learn_more_opened · indicator_page_viewed · indicator_cta_clicked · 최근 30일"
      >
        {learnMore
          ? <IndicatorLearnMore data={learnMore} />
          : <NotConfigured message="PostHog API 연결 후 표시됩니다." />
        }
      </SectionCard>

      {/* ══════════════════════════════════════
          9. 실전 챌린지 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="challenge"
        title="실전 챌린지 분석"
        sub="challenge_* + simulation_* · 예측 분포 · 평균 사용 지표 수 · 최근 30일"
      >
        {events ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* 좌: KPI 행 */}
            <div className="space-y-0">
              {[
                {
                  label:   '챌린지 시작',
                  value:   chalStart30.toLocaleString(),
                  tooltip: 'challenge_started 이벤트 수',
                },
                {
                  label:   '예측 제출',
                  value:   cnt(events, 'challenge_prediction_submitted').toLocaleString(),
                  tooltip: 'challenge_prediction_submitted 이벤트 수',
                },
                {
                  label:   '챌린지 완료',
                  value:   chalDone30.toLocaleString(),
                  tooltip: 'challenge_completed 이벤트 수',
                },
                {
                  label:   '완료율',
                  value:   `${chalRate}%`,
                  tooltip: 'challenge_completed / challenge_started × 100',
                },
                {
                  label:   '평균 사용 지표 수',
                  value:   avgInd != null ? `${avgInd}개` : '–',
                  tooltip: 'challenge_started.active_indicators_count 평균',
                },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2 border-b border-navi-border/40"
                >
                  <span className="text-[12px] text-navi-secondary">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-navi-text">{row.value}</span>
                    <div className="relative group">
                      <span className="text-[10px] text-navi-muted/50 cursor-help">ⓘ</span>
                      <div className="
                        absolute right-0 bottom-5 z-50 w-52
                        bg-[#1e2a3a] border border-[#334155] rounded-xl px-3 py-2 shadow-lg
                        opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto
                        transition-opacity duration-150 text-left
                      ">
                        <p className="text-[11px] text-[#CBD5E1]">{row.tooltip}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 우: 예측 방향 분포 */}
            <div>
              <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                예측 방향 분포
              </p>
              {prediction && prediction.length > 0 ? (
                <HBarChart
                  unit="회"
                  bars={prediction.map(p => ({
                    label: predLabels[p.direction] ?? p.direction,
                    value: p.cnt,
                  }))}
                />
              ) : (
                <p className="text-[12px] text-navi-muted">데이터 없음</p>
              )}
            </div>
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          10. 챌린지 재도전 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="retry"
        title="챌린지 재도전 분석"
        sub="simulation_retry · 재도전 횟수 분포 · 최근 30일"
      >
        {retry ? (
          <div className="grid sm:grid-cols-2 gap-6 items-start">
            {/* 요약 KPI */}
            <div className="space-y-0">
              {[
                { label: '총 재도전 횟수', value: retryTotal.toLocaleString() },
                { label: '평균 재도전',    value: avgRetry },
                { label: '재도전율',       value: `${retryRate}%` },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2 border-b border-navi-border/40"
                >
                  <span className="text-[12px] text-navi-secondary">{row.label}</span>
                  <span className="text-[14px] font-bold text-navi-text">{row.value}</span>
                </div>
              ))}

              {/* 버킷 */}
              <div className="pt-4 space-y-2">
                {retryBuckets.map(b => (
                  <div key={b.label} className="flex justify-between items-center text-[12px]">
                    <span className="text-navi-secondary">{b.label}</span>
                    <span className="font-bold text-navi-text">{b.freq.toLocaleString()}명</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 분포 바 차트 */}
            {retry.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                  재도전 횟수별 분포
                </p>
                <HBarChart
                  unit="명"
                  bars={retry.slice(0, 10).map(r => ({
                    label: `${r.retry}회 재도전`,
                    value: r.freq,
                  }))}
                />
              </div>
            )}
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          11. 지표 활용도 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="indicators"
        title="지표 · 작도 도구 활용도"
        sub="indicator_enabled + drawing_tool_used · 사용 횟수 / 사용자 수 · 최근 30일"
      >
        {indicators || drawings ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* 분석 지표 */}
            <div>
              <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                분석 지표 (indicator_enabled)
              </p>
              {indicators && indicators.length > 0 ? (
                <div className="space-y-2.5">
                  {indicators.map(ind => {
                    const totalCnt = indicators.reduce((s, i) => s + i.cnt, 0)
                    const sharePct = totalCnt > 0 ? Math.round((ind.cnt / totalCnt) * 100) : 0
                    return (
                      <div key={ind.indicator}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[12px] font-semibold text-navi-text">
                            {ind.indicator.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-3 text-right">
                            <span className="text-[11px] text-navi-muted">
                              {ind.users.toLocaleString()}명
                            </span>
                            <span className="text-[12px] font-bold text-navi-text w-16 text-right">
                              {ind.cnt.toLocaleString()}회
                            </span>
                            <span className="text-[11px] text-navi-muted w-8 text-right">
                              {sharePct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-navi-surface2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-navi-action/70 rounded-full transition-all duration-500"
                            style={{ width: `${sharePct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-[12px] text-navi-muted">데이터 없음</p>}
            </div>

            {/* 작도 도구 */}
            <div>
              <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                작도 도구 (drawing_tool_used)
              </p>
              {drawings && drawings.length > 0 ? (
                <div className="space-y-3">
                  {drawings.map(d => {
                    const toolLabel = d.tool === 'trendline' ? '추세선 (Trendline)'
                                    : d.tool === 'fibonacci' ? '피보나치 (Fibonacci)'
                                    : d.tool
                    return (
                      <div key={d.tool} className="bg-navi-surface2 rounded-xl p-3.5">
                        <p className="text-[12px] font-semibold text-navi-text mb-1">{toolLabel}</p>
                        <div className="flex items-center gap-4 text-[12px]">
                          <span className="text-navi-muted">
                            사용 횟수 <span className="font-bold text-navi-text">{d.cnt.toLocaleString()}회</span>
                          </span>
                          <span className="text-navi-muted">
                            사용자 <span className="font-bold text-navi-text">{d.users.toLocaleString()}명</span>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-[12px] text-navi-muted">데이터 없음</p>}
            </div>
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          캔들 패턴 학습 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="candle"
        title="캔들 패턴 학습 분석"
        sub="candle_learning_* 이벤트 · 최근 30일"
      >
        {IS_POSTHOG_CONFIGURED ? (
          <div className="space-y-5">
            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                label="학습 시작"
                value={candleStart30.toLocaleString()}
                sub="candle_learning_started"
              />
              <KPICard
                label="학습 완료"
                value={candleDone30.toLocaleString()}
                sub="candle_learning_completed"
              />
              <KPICard
                label="완료율"
                value={candleStart30 > 0 ? fmtPct(candleRate30) : '–'}
                accent={candleRate30 >= 50}
                sub="완료 / 시작"
              />
              <KPICard
                label="시작률"
                value={visitors30 > 0 ? fmtPct(pct(candleStart30, visitors30)) : '–'}
                sub="방문자 대비"
              />
            </div>

            {/* 패턴별 테이블 */}
            {candleStats && candleStats.length > 0 ? (
              <div>
                <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                  패턴별 상세
                </p>
                {/* 헤더 */}
                <div className="grid grid-cols-[1fr_60px_60px_64px_64px] text-[10px] font-bold uppercase tracking-[0.06em] text-navi-muted px-2 pb-2 border-b border-navi-border/40">
                  <span>패턴</span>
                  <span className="text-right">시작</span>
                  <span className="text-right">완료</span>
                  <span className="text-right">완료율</span>
                  <span className="text-right">정답률</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {candleStats.map(s => (
                    <div key={s.pattern}
                      className="grid grid-cols-[1fr_60px_60px_64px_64px] items-center px-2 py-2 rounded-lg hover:bg-navi-surface2/50 transition-colors">
                      <span className="text-[12px] font-semibold text-navi-text">
                        {CANDLE_PATTERN_LABELS[s.pattern] ?? s.pattern}
                      </span>
                      <span className="text-[12px] text-navi-secondary text-right">{s.started}</span>
                      <span className="text-[12px] text-navi-secondary text-right">{s.completed}</span>
                      <span className={`text-[12px] font-bold text-right ${s.completeRate >= 50 ? 'text-[#34D399]' : s.completeRate < 25 && s.started > 0 ? 'text-navi-danger' : 'text-navi-text'}`}>
                        {s.started > 0 ? `${s.completeRate}%` : '–'}
                      </span>
                      <span className={`text-[12px] font-bold text-right ${s.accuracy >= 60 ? 'text-[#34D399]' : s.accuracy < 35 && s.completed > 0 ? 'text-navi-danger' : 'text-navi-text'}`}>
                        {s.completed > 0 ? `${s.accuracy}%` : '–'}
                      </span>
                    </div>
                  ))}
                </div>
                {/* 가장 어려운 패턴 */}
                {hardestCandle && hardestCandle.completed > 0 && (
                  <div className="mt-3 bg-navi-danger/[0.07] border border-navi-danger/25 rounded-xl px-4 py-3">
                    <p className="text-[11px] text-navi-muted mb-1">가장 어려운 패턴</p>
                    <p className="text-[14px] font-bold text-navi-danger">
                      {CANDLE_PATTERN_LABELS[hardestCandle.pattern] ?? hardestCandle.pattern}
                    </p>
                    <p className="text-[11px] text-navi-secondary">정답률 {hardestCandle.accuracy}%</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-navi-muted">데이터 없음</p>
            )}
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          거래량 학습 분석
      ══════════════════════════════════════ */}
      <SectionCard
        id="volume"
        title="거래량 학습 분석"
        sub="volume_learning_* 이벤트 · 최근 30일"
      >
        {IS_POSTHOG_CONFIGURED ? (
          <div className="space-y-5">
            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                label="학습 시작"
                value={volumeStart30.toLocaleString()}
                sub="volume_learning_started"
              />
              <KPICard
                label="학습 완료"
                value={volumeDone30.toLocaleString()}
                sub="volume_learning_completed"
              />
              <KPICard
                label="완료율"
                value={volumeStart30 > 0 ? fmtPct(volumeRate30) : '–'}
                accent={volumeRate30 >= 50}
                sub="완료 / 시작"
              />
              <KPICard
                label="시작률"
                value={visitors30 > 0 ? fmtPct(pct(volumeStart30, visitors30)) : '–'}
                sub="방문자 대비"
              />
            </div>

            {/* 주제별 테이블 */}
            {volumeStats && volumeStats.length > 0 ? (
              <div>
                <p className="text-[11px] font-bold text-navi-muted uppercase tracking-[0.08em] mb-3">
                  주제별 상세
                </p>
                <div className="grid grid-cols-[1fr_60px_60px_64px_64px] text-[10px] font-bold uppercase tracking-[0.06em] text-navi-muted px-2 pb-2 border-b border-navi-border/40">
                  <span>주제</span>
                  <span className="text-right">시작</span>
                  <span className="text-right">완료</span>
                  <span className="text-right">완료율</span>
                  <span className="text-right">정답률</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {volumeStats.map(s => (
                    <div key={s.topic}
                      className="grid grid-cols-[1fr_60px_60px_64px_64px] items-center px-2 py-2 rounded-lg hover:bg-navi-surface2/50 transition-colors">
                      <span className="text-[12px] font-semibold text-navi-text">
                        {VOLUME_TOPIC_LABELS[s.topic] ?? s.topic}
                      </span>
                      <span className="text-[12px] text-navi-secondary text-right">{s.started}</span>
                      <span className="text-[12px] text-navi-secondary text-right">{s.completed}</span>
                      <span className={`text-[12px] font-bold text-right ${s.completeRate >= 50 ? 'text-[#34D399]' : s.completeRate < 25 && s.started > 0 ? 'text-navi-danger' : 'text-navi-text'}`}>
                        {s.started > 0 ? `${s.completeRate}%` : '–'}
                      </span>
                      <span className={`text-[12px] font-bold text-right ${s.accuracy >= 60 ? 'text-[#34D399]' : s.accuracy < 35 && s.completed > 0 ? 'text-navi-danger' : 'text-navi-text'}`}>
                        {s.completed > 0 ? `${s.accuracy}%` : '–'}
                      </span>
                    </div>
                  ))}
                </div>
                {worstVolume && worstVolume.started > 0 && (
                  <div className="mt-3 bg-amber-500/[0.07] border border-amber-500/25 rounded-xl px-4 py-3">
                    <p className="text-[11px] text-navi-muted mb-1">가장 이탈 많은 주제</p>
                    <p className="text-[14px] font-bold text-amber-400">
                      {VOLUME_TOPIC_LABELS[worstVolume.topic] ?? worstVolume.topic}
                    </p>
                    <p className="text-[11px] text-navi-secondary">완료율 {worstVolume.completeRate}%</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-navi-muted">데이터 없음</p>
            )}
          </div>
        ) : <NotConfigured message="PostHog API 연결 후 표시됩니다." />}
      </SectionCard>

      {/* ══════════════════════════════════════
          12. 최근 이벤트 로그
      ══════════════════════════════════════ */}
      <SectionCard
        id="log"
        title="사용자 행동 로그"
        sub="최근 24시간 · 60초마다 자동 갱신 · 최대 100건"
      >
        <EventLog initialData={recentEvt} />
      </SectionCard>

      {/* ══════════════════════════════════════
          13. Session Replay 바로가기
      ══════════════════════════════════════ */}
      <SectionCard
        id="replay"
        title="Session Replay 바로가기"
        sub="PostHog 녹화 영상 · 이벤트 기반 필터 링크"
      >
        <div className="space-y-3">
          <p className="text-[12px] text-navi-secondary leading-relaxed">
            Session Replay는 PostHog 대시보드에서 직접 확인하세요.
            아래 바로가기로 특정 이벤트 기준 세션을 필터링할 수 있습니다.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: '전체 세션 목록',
                href:  'https://us.posthog.com/recordings',
                desc:  '모든 녹화 세션 확인',
              },
              {
                label: 'MACD 퀴즈 오답 세션',
                href:  'https://us.posthog.com/recordings?filters=%5B%7B"id"%3A"tutorial_judgment_answered","type"%3A"events","order"%3A0,"name"%3A"tutorial_judgment_answered","properties"%3A%5B%7B"key"%3A"is_correct","value"%3A%5B"false"%5D%7D%5D%7D%5D',
                desc:  'is_correct=false 필터',
              },
              {
                label: '튜토리얼 이탈 세션',
                href:  'https://us.posthog.com/recordings?filters=%5B%7B"id"%3A"tutorial_exit","type"%3A"events"%7D%5D',
                desc:  'tutorial_exit 필터',
              },
              {
                label: '챌린지 완료 세션',
                href:  'https://us.posthog.com/recordings?filters=%5B%7B"id"%3A"challenge_completed","type"%3A"events"%7D%5D',
                desc:  'challenge_completed 필터',
              },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-start gap-3 p-3.5 rounded-xl
                  bg-navi-surface2 border border-navi-border
                  hover:border-navi-action/40 hover:bg-navi-action/[0.04]
                  transition-all group
                "
              >
                <div className="mt-0.5 w-7 h-7 rounded-lg bg-navi-action/10 flex items-center justify-center shrink-0">
                  <span className="text-[13px]">▶</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-navi-text group-hover:text-navi-action transition-colors">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-navi-muted">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </SectionCard>

    </div>
  )
}
