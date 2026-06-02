# NAVIchart — 코드베이스 구조 문서

> 작성일: 2025년 6월  
> 스택: Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · Lightweight Charts

---

## 1. 서비스 개요

NAVIchart는 주식 차트 분석을 처음 배우는 사람을 위한 **인터랙티브 교육 플랫폼**입니다.  
단순히 개념을 읽는 것이 아니라, 차트를 직접 클릭하고 판단하고 예측하면서 학습합니다.

### 핵심 기능

| 기능 | 설명 |
|---|---|
| **기초 튜토리얼** | 캔들·추세선·지표(MA·RSI·MACD·BB)를 16단계로 실습 |
| **심화 학습** | RSI / MACD / 피보나치 각 3~6단계 개별 레슨 |
| **종합 테스트** | 튜토리얼 마지막에 실제 차트 데이터로 자동 채점 |
| **실전 챌린지** | 실제 NVDA 과거 데이터로 미래 30일 방향 예측 |
| **지표 상세** | 6개 지표(RSI·MACD·BB·MA·추세선·피보나치) 개별 설명 페이지 |

---

## 2. 기술 스택

| 분류 | 라이브러리 | 버전 | 용도 |
|---|---|---|---|
| 프레임워크 | Next.js | 14.2.3 | App Router, API Routes, SSR/SSG |
| UI | React | ^18 | 컴포넌트 렌더링 |
| 스타일 | Tailwind CSS | ^3.4.1 | CSS 변수 기반 디자인 시스템 |
| 상태 관리 | Zustand | ^4.5.2 | 클라이언트 상태 + localStorage 영속화 |
| 차트 | Lightweight Charts | ^4.1.3 | 캔들스틱·지표 차트 (TradingView 오픈소스) |
| 애니메이션 | Framer Motion | ^11.1.7 | 카드·오버레이·바텀시트 트랜지션 |
| 언어 | TypeScript | ^5 | 전체 타입 안전성 |
| 유틸 | clsx | ^2.1.1 | 조건부 className 조합 |
| 분석 | posthog-js | ^1.378.1 | PostHog 이벤트·Session Replay |

---

## 3. 디렉토리 구조

```
navi-chart/
├── src/
│   ├── app/                     # Next.js App Router 라우트
│   │   ├── page.tsx             # 랜딩 (/)
│   │   ├── layout.tsx           # 루트 레이아웃 (Analytics 초기화)
│   │   ├── chart/page.tsx       # 메인 차트 페이지
│   │   ├── tutorial/page.tsx    # 튜토리얼 소개 페이지
│   │   ├── simulate/page.tsx    # 실전 챌린지 페이지
│   │   ├── indicator/[slug]/    # 지표 상세 (6개 동적 라우트)
│   │   ├── practice/page.tsx    # 퀴즈 모드 (Coming Soon)
│   │   └── api/candles/         # Yahoo Finance 프록시 API
│   │
│   ├── components/
│   │   ├── analytics/           # GA4 + PostHog 연동
│   │   ├── chart/               # 차트·도구 UI
│   │   ├── tutorial/            # 튜토리얼 오버레이 UI
│   │   ├── simulate/            # 실전 챌린지 UI
│   │   ├── mobile/              # 모바일 전용 컴포넌트
│   │   └── ui/                  # 공용 디자인 시스템
│   │
│   ├── stores/                  # Zustand 상태 스토어 (4개)
│   ├── data/                    # 정적 콘텐츠 데이터
│   ├── hooks/                   # 커스텀 React 훅
│   ├── lib/                     # 유틸리티 함수
│   └── types/                   # TypeScript 타입 정의
│
├── public/                      # 정적 파일 (로고, 이미지)
├── ANALYTICS.md                 # 분석 체계 문서
├── CODEBASE.md                  # 코드 구조 문서 (이 파일)
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. 라우트 구조

```
/                →  랜딩 페이지 (Server Component)
/chart           →  메인 학습 차트 (Client Component)
/tutorial        →  튜토리얼 소개 (Client Component)
/simulate        →  실전 챌린지 (Client Component)
/indicator/[slug] → 지표 상세 6종 (Server Component + generateStaticParams)
/practice        →  퀴즈 모드 Coming Soon 플레이스홀더
/api/candles     →  Yahoo Finance 캔들 데이터 API
```

### 페이지별 역할

**`/` — 랜딩 페이지**  
서버 컴포넌트. CTA 버튼(`LandingCTA.tsx`)만 클라이언트 컴포넌트로 분리해 클릭 이벤트 추적.

**`/chart` — 메인 차트**  
앱의 핵심 페이지. 차트·지표·작도 도구·튜토리얼이 모두 이 페이지 위에서 동작.  
`?onboard=1` 파라미터로 튜토리얼 강제 시작, `?lesson=[key]`로 심화 레슨 시작.

**`/tutorial` — 소개 페이지**  
학습 여정(4단계)을 소개하고 `/chart?onboard=1`로 연결.

**`/simulate` — 실전 챌린지**  
NVDA 과거 데이터 350일을 로드해 분석→예측→결과 확인 흐름 실행.  
`?guide=1`로 사용 설명 모달 강제 표시, `?from=tutorial`로 튜토리얼 완료 배너 표시.

**`/indicator/[slug]` — 지표 상세**  
6개(rsi·macd·bollinger·moving-average·trendline·fibonacci) 빌드 타임 정적 생성.  
설명 + `MiniChartPreview`로 실제 차트 위에 지표 시각화.

---

## 5. 컴포넌트 구조

### 5-1. Chart (차트 & 도구)

```
chart/
├── ChartContainer.tsx     ← 메인 캔들차트 (Lightweight Charts 래퍼)
│                            MA·BB 오버레이, 추세선·피보나치 작도 처리
│                            튜토리얼 focusBarsFromEnd 뷰포트 제어
├── RSIChart.tsx           ← RSI 서브 차트 (70/30 기준선, 메인과 동기화)
├── MACDChart.tsx          ← MACD 서브 차트 (선 + 히스토그램, 메인과 동기화)
├── IndicatorToolbar.tsx   ← MA·RSI·MACD·BB 토글 버튼
├── DrawingToolbar.tsx     ← 추세선·피보나치·지우기 버튼 + 단계별 가이드
├── PeriodToolbar.tsx      ← 기간(1M~ALL)·봉 단위(일·주·월) 선택
├── MiniChartPreview.tsx   ← 지표 상세 페이지용 소형 차트
└── ToolTooltip.tsx        ← 도구 버튼 호버 설명 팝오버 (PC 전용)
```

**차트 동기화 방식**  
메인 차트·RSI·MACD는 `lib/chartSync.ts`의 pub/sub 패턴으로 타임스케일을 공유합니다.  
메인 차트가 register → 서브 차트들이 subscribe → 범위 변경 시 모두 동시 업데이트.

### 5-2. Tutorial (튜토리얼 오버레이)

```
tutorial/
├── TutorialManager.tsx    ← 튜토리얼 활성 시 오버레이 + 카드 마운트/언마운트 관리
├── TutorialStep.tsx       ← 핵심 컴포넌트. 스포트라이트 + 카드 위치 계산
│                            판단형 퀴즈, 종합 테스트, 지표 토글 감지
├── TutorialComplete.tsx   ← 기초 과정 완료 화면 ("실전 챌린지로 가기" CTA)
├── TutorialMenuButton.tsx ← 학습 메뉴 드롭다운 (기초·심화 3종 선택)
└── DarkOverlay.tsx        ← 배경 어두운 오버레이 + 타겟 요소 스포트라이트
```

**스포트라이트 메커니즘**  
`targetSelector`로 DOM 요소를 찾아 `getBoundingClientRect()`로 좌표를 계산.  
카드 위치(`position: 'top'|'bottom'|'left'|'right'`)에 따라 충돌 방지 로직 실행.  
조건부 렌더 요소(RSI·MACD 차트)는 `scrollToSel()` 재시도 함수로 안정적 스크롤 보장.

### 5-3. Simulate (실전 챌린지)

```
simulate/
├── SimulateChart.tsx      ← 챌린지 차트. 3단계 phase 관리
│                            analyzing → predicting → revealed
│                            과거 데이터 표시, 결과 숨김/공개 전환
├── ChallengeGuide.tsx     ← 사용 설명 모달 (첫 방문 시 자동 표시)
└── ChallengeIntro.tsx     ← 챌린지 진입 소개 컴포넌트
```

### 5-4. Analytics

```
analytics/
├── GoogleAnalytics.tsx    ← GA4 스크립트 로드 + SPA 페이지뷰 (Production 전용)
├── PostHogProvider.tsx    ← PostHog 초기화 + 페이지뷰 + Session Replay (Production 전용)
└── LandingCTA.tsx         ← 홈 CTA 버튼 (Server Component 분리, 클릭 이벤트 추적)
```

### 5-5. UI (디자인 시스템)

```
ui/
├── ThemeToggle.tsx        ← Dark / Light 모드 전환 버튼 그룹
├── NaviSymbol.tsx         ← NAVI 앱 로고 SVG (3개 폴리곤)
├── NaviWordmark.tsx       ← NAVI 텍스트 로고
├── DifficultyBadge.tsx    ← 지표 난이도 배지 (1·2·3단계)
├── RoundedCard.tsx        ← 섹션 래퍼 카드 (지표 상세 페이지)
├── ProgressDots.tsx       ← 튜토리얼 진행 점 표시
├── IndicatorToast.tsx     ← 지표 활성화 토스트 알림
└── LearningPath.tsx       ← 학습 경로 시각화
```

---

## 6. 상태 관리 (Zustand)

총 4개의 스토어. `persist` 미들웨어로 필요한 상태만 localStorage에 저장.

### chartStore — 차트 전역 상태

```typescript
// 영속화 없음 (페이지 이동 시 초기화)
{
  candleData: CandleData[]      // 로드된 캔들 데이터
  isLoading: boolean
  period: '1M'|'3M'|'6M'|'1Y'|'ALL'
  timeUnit: 'daily'|'weekly'|'monthly'

  activeIndicators: Set<IndicatorSlug>  // 현재 활성 지표 목록
  drawingTool: 'none'|'trendline'|'fibonacci'|'erase'
  drawingStep: 0 | 1            // 작도 진행 단계 (0: 시작점, 1: 끝점)
  clearDrawingsSignal: number   // 증가 시 차트가 모든 작도 삭제
}
```

### tutorialStore — 튜토리얼 진행 상태

```typescript
// persist: hasCompletedOnce 만 저장
{
  isActive: boolean
  currentIndex: number
  steps: TutorialStep[]
  currentStep: TutorialStep | null

  stepDone: boolean             // 현재 단계 액션 완료 여부
  focusBarsFromEnd: number|null // 차트 뷰포트 조절

  isLesson: boolean             // 심화 레슨 모드 여부
  currentLessonKey: string|null // 'fibonacci-advanced'|'rsi-advanced'|'macd-advanced'

  hasCompletedOnce: boolean     // ← localStorage 저장 (재방문 시 튜토리얼 자동 시작 방지)
  showCompletionScreen: boolean
}
```

### learnStore — 학습 이력

```typescript
// persist: 전체 저장
{
  triedIndicators: string[]  // 사용해본 지표 slug 목록
  triedDrawing: boolean      // 작도 도구 사용 여부
  simCount: number           // 시뮬레이션 완료 횟수
}
```

### themeStore — 테마

```typescript
// persist: 전체 저장
{
  mode: 'dark' | 'light'
}
```

---

## 7. 데이터 레이어

### 7-1. API 라우트 (`/api/candles`)

Yahoo Finance를 프록시하는 서버 사이드 엔드포인트.

```
GET /api/candles?symbol=NVDA&period=1Y&timeUnit=1d

→ CandleData[]  { time, open, high, low, close }
캐시: 300초 (Cache-Control: s-maxage=300)
```

### 7-2. 정적 데이터 (`src/data`)

| 파일 | 내용 |
|---|---|
| `indicators.ts` | 6개 지표의 메타데이터. name, description, howToRead, tips, caution, difficulty |
| `tutorialSteps.ts` | 기초 튜토리얼 16단계 정의 |
| `lessonSteps/rsiAdvanced.ts` | RSI 심화 레슨 단계 배열 |
| `lessonSteps/macdAdvanced.ts` | MACD 심화 레슨 단계 배열 |
| `lessonSteps/fibonacci.ts` | 피보나치 심화 레슨 단계 배열 |
| `mockCandles.ts` | LCG 난수 기반 NVDA 모사 캔들 350일치 (API 실패 시 폴백) |

### 7-3. 지표 계산 (`src/lib/indicators.ts`)

4개 지표를 순수 함수로 계산. 외부 라이브러리 미사용.

```typescript
calcMA(data, period)             → MAPoint[]   { time, value }
calcRSI(data, period=14)         → RSIPoint[]  { time, value }
calcMACD(data, 12, 26, 9)        → MACDPoint[] { time, macd, signal, histogram }
calcBollingerBands(data, 20, 2)  → BBPoint[]   { time, upper, middle, lower }
```

---

## 8. 핵심 기능 메커니즘

### 8-1. 튜토리얼 자동 시작

```
앱 최초 진입
  └── hasCompletedOnce === false
        └── setTimeout(start, 500ms)  ← 차트 로드 후 실행

?onboard=1 파라미터
  └── 완료 여부 무관하게 강제 시작

?lesson=fibonacci-advanced
  └── 심화 레슨 직접 시작
```

### 8-2. 튜토리얼 단계 전환 흐름

```
단계 진입
  │
  ├─ clearIndicatorsOnEnter → 지정 지표 끄기
  ├─ activateIndicatorsOnEnter → 지정 지표 켜기
  ├─ clearDrawingsOnEnter → 작도 초기화
  └─ focusBarsFromEnd → 차트 뷰포트 이동
  │
  └─ actionRequired 유형별 대기
       ├─ 'free'               → 즉시 다음 가능
       ├─ 'candle-click'       → 차트 캔들 클릭 대기
       ├─ 'indicator-toggle'   → 지정 지표 활성화 대기
       ├─ 'judgment'           → 선택지 정답 선택 대기
       └─ 'comprehensive-test' → 4문항 모두 답변 대기
```

### 8-3. 차트 작도 (추세선·피보나치)

```
drawingTool 활성화
  └── drawingStep = 0 (첫 번째 점 대기)
        └── 차트 클릭 → pendingRef에 시작점 저장
              └── drawingStep = 1 (두 번째 점 대기)
                    └── 차트 클릭 → 선 확정, 렌더
                          └── drawingTool → 'none' (완료)
```

### 8-4. 차트 동기화

```
메인 차트 ─── chartSync.register(chart)
              │
RSI 차트  ─── chartSync.subscribe(fn)  ← 범위 변경 시 fn(range) 호출
MACD 차트 ─── chartSync.subscribe(fn)
```

### 8-5. 실전 챌린지 Phase 흐름

```
'analyzing'   →  과거 350일 차트 표시, 도구 사용 가능
      ↓ "분석 완료 — 이제 예측해볼게요" 클릭
'predicting'  →  상승/횡보/하락 3지선
      ↓ 예측 선택
'revealed'    →  미래 30일 공개, 정답 여부 + 지표 신호 디브리핑
      ↓ "다른 구간 도전" 클릭
'analyzing'   →  새로운 구간으로 재시작 (attempt + 1)
```

---

## 9. 타입 시스템

### 핵심 타입

```typescript
// 캔들 데이터 (차트·지표 계산·챌린지 공용)
interface CandleData {
  time: string   // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}

// 지표 메타데이터
type IndicatorSlug = 'rsi' | 'macd' | 'bollinger' | 'moving-average' | 'trendline' | 'fibonacci'

interface Indicator {
  slug: IndicatorSlug
  name: string
  description: string
  howToRead: string[]
  tips?: string[]
  caution?: string
  difficulty: 1 | 2 | 3
}

// 튜토리얼 단계 정의
interface TutorialStep {
  id: string
  targetSelector: string            // CSS 셀렉터 (스포트라이트 대상)
  mobileTargetSelector?: string     // 모바일 전용 셀렉터
  completionTargetSelector?: string // 단계 완료 후 전환될 셀렉터
  title: string
  body: string
  position: 'top' | 'bottom' | 'left' | 'right'
  actionRequired?: ActionType
  indicatorKey?: IndicatorSlug
  judgment?: JudgmentConfig
  focusBarsFromEnd?: number
  clearIndicatorsOnEnter?: IndicatorSlug[]
  activateIndicatorsOnEnter?: IndicatorSlug[]
  clearDrawingsOnEnter?: boolean
  fibGuide?: FibGuide               // 피보나치 가이드 마커
  floatSide?: 'bottom-right'
}
```

---

## 10. 커스텀 훅

| 훅 | 역할 |
|---|---|
| `useStockData(symbol)` | `/api/candles` 호출. period·timeUnit 변경 시 자동 재요청. 경쟁 조건(race condition) 방지. |
| `useMobile(breakpoint=768)` | SSR 안전한 모바일 감지. 하이드레이션 후 실제 뷰포트 기준. |
| `useTheme()` | themeStore 래퍼. `html.classList` 동기화 포함. |

---

## 11. 반응형 설계 원칙

`sm:` 브레이크포인트(768px) 기준으로 모바일·PC 레이아웃을 분기합니다.

| 영역 | 모바일 | PC |
|---|---|---|
| 분석·작도 도구 | 좌우 2열 그리드 | 동일 (2열) |
| 튜토리얼 카드 | 화면 하단 바텀시트 (30~55vh) | 차트 옆 플로팅 카드 |
| 툴팁 | 숨김 (`hidden sm:block`) | 호버 팝오버 표시 |
| 헤더 버튼 | 학습·챌린지 버튼 숨김, 테마 토글만 | 전체 표시 |
| CTA 버튼 | 차트 하단 2열 배치 | 헤더에 배치 |
| 지표 링크 | 2열 그리드 | 3열 그리드 |

---

## 12. 디자인 시스템 (Tailwind)

CSS 변수 기반으로 다크·라이트 테마를 전환합니다.  
`html.classList`에 `light` 클래스 유무로 전환 (FOUC 방지 인라인 스크립트 포함).

### 색상 토큰

```
배경·표면   navi-bg, navi-surface, navi-surface2, navi-surface3
경계선     navi-border, navi-border2
텍스트     navi-text, navi-secondary, navi-muted, navi-disabled
브랜드     navi-accent, navi-accent-hover
행동       navi-action (#5B7FFF), navi-action-hover
시맨틱     navi-success, navi-danger, navi-warning, navi-info
차트       navi-bullish (green), navi-bearish (red)
```

### Path Alias

```json
"@/*": ["./src/*"]
```

모든 import에서 `@/components/...`, `@/stores/...` 형식으로 사용.

---

## 13. 빌드·배포

| 항목 | 설정 |
|---|---|
| 플랫폼 | Vercel |
| 빌드 | `next build` (정적 생성 + SSR 혼합) |
| 환경변수 | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| 정적 생성 | `/indicator/[slug]` — 빌드 타임 6개 페이지 생성 |
| API 캐시 | `/api/candles` — `s-maxage=300` (5분) |
| 분석 활성 조건 | `NODE_ENV === 'production'` |
