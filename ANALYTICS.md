# NAVIchart — 사용자 분석 구조 문서

> 작성일: 2025년 6월  
> 대상: GA4 + PostHog 이중 수집 구조

---

## 1. 개요

NAVIchart는 교육 서비스입니다.  
단순 페이지 방문 수보다 **"사용자가 어떤 단계까지 학습했는가"**, **"어떤 개념을 이해하지 못했는가"** 를 측정하는 것이 핵심 목표입니다.

### 분석 도구 역할 분담

| 도구 | 주 역할 |
|---|---|
| **Google Analytics 4** | 전체 트래픽 · 유입 경로 · 퍼널 전환율 |
| **PostHog** | 학습 행동 심층 분석 · Session Replay · 개별 사용자 여정 |

---

## 2. 기술 구조

### 파일 구성

```
src/
├── app/
│   └── layout.tsx                     ← 루트 레이아웃 (GA4 + PostHog 초기화)
├── components/
│   └── analytics/
│       ├── GoogleAnalytics.tsx        ← GA4 스크립트 + SPA 페이지뷰
│       ├── PostHogProvider.tsx        ← PostHog 초기화 + 페이지뷰 + Session Replay
│       └── LandingCTA.tsx            ← 홈 CTA 버튼 (클릭 이벤트 포함)
└── lib/
    └── analytics.ts                   ← trackEvent() 단일 함수
```

### 단일 진입점

모든 이벤트는 `trackEvent()` 하나를 통해 GA4와 PostHog로 **동시 전송**됩니다.

```typescript
// 사용 예시
trackEvent('tutorial_started', {
  has_completed_before: false,
  total_steps: 16,
  device_type: 'mobile',
})
```

```
trackEvent('event', { ...props })
        │
        ├── GA4      window.gtag('event', ...)
        └── PostHog  posthog.capture(...)
```

### 동작 환경

| 환경 | GA4 | PostHog |
|---|---|---|
| Development | ❌ 비활성 | ❌ 비활성 |
| Production (Vercel) | ✅ 활성 | ✅ 활성 |

> 개발 환경에서는 `console.log`로 이벤트를 확인할 수 있습니다.  
> 서버로는 전송되지 않아 프로덕션 대시보드 오염을 방지합니다.

---

## 3. 설정 값

### GA4

| 항목 | 값 |
|---|---|
| Measurement ID | `G-E6ZSJ0V4P6` |
| 페이지뷰 방식 | 첫 페이지: init 자동 전송 / 이후 이동: `usePathname` 수동 전송 |
| 자동 이벤트 수집 | 기본 GA4 측정 (스크롤, 외부 링크 등) |

### PostHog

| 항목 | 값 |
|---|---|
| Host | `https://us.i.posthog.com` |
| API Key | `NEXT_PUBLIC_POSTHOG_KEY` (환경변수) |
| 페이지뷰 방식 | `usePathname` + `useSearchParams` 수동 전송 |
| autocapture | `false` (커스텀 이벤트만 수집, 노이즈 방지) |
| Session Replay | 코드 활성화 완료 (대시보드 토글 필요) |
| 페이지 이탈 추적 | `capture_pageleave: true` |
| 사용자 식별 | 익명 UUID 자동 생성 → localStorage 재사용 |

---

## 4. 이벤트 전체 목록

### 4-1. 랜딩 · 진입

| 이벤트 | 발화 시점 | Properties |
|---|---|---|
| `$pageview` | 모든 페이지 이동 | `$current_url` |
| `landing_cta_clicked` | 홈(`/`) CTA 버튼 클릭 | `destination: 'tutorial' \| 'chart'` |

---

### 4-2. 기초 튜토리얼 (16단계)

| 이벤트 | 발화 시점 | Properties |
|---|---|---|
| `tutorial_started` | 튜토리얼 최초 시작 | `has_completed_before`, `total_steps`, `device_type` |
| `tutorial_step_viewed` | 각 단계 진입 | `tutorial: 'basic'`, `step`, `step_id`, `total_steps`, `action_required` |
| `tutorial_step_completed` | "다음 →" 클릭 | `step_number`, `tutorial_type: 'basic'` |
| `tutorial_judgment_answered` | 판단형 문제 선택 (정답·오답 모두) | `tutorial`, `step_id`, `step`, `chosen`, `is_correct` |
| `comprehensive_test_answered` | 종합 테스트 각 문항 선택 | `question_index`, `question_id`, `chosen`, `is_correct` |
| `tutorial_completed` | "기초 과정 완료" 클릭 | `total_steps`, `device_type` |
| `tutorial_exit` | 건너뛰기 / ✕ 클릭 | `tutorial_type`, `step_number` |

**`tutorial_judgment_answered` 상세**

판단형 문제(예: "현재 RSI 상태는?")의 모든 선택을 기록합니다.  
정답을 맞힐 때까지 여러 번 시도할 수 있으며, 시도마다 이벤트가 발송됩니다.

```
step_id: 'macd-golden'  chosen: 'bearish'  is_correct: false   → 오답 시도
step_id: 'macd-golden'  chosen: 'bullish'  is_correct: true    → 정답
```

---

### 4-3. 심화 학습 (RSI · MACD · 피보나치)

| 이벤트 | 발화 시점 | Properties |
|---|---|---|
| `advanced_learning_opened` | 학습 메뉴 열기 | — |
| `advanced_rsi_started` | RSI 심화 시작 | `lesson_type: 'rsi'`, `total_steps`, `device_type` |
| `advanced_rsi_completed` | RSI 심화 완료 | `lesson_type: 'rsi'`, `total_steps`, `device_type` |
| `advanced_macd_started` | MACD 심화 시작 | `lesson_type: 'macd'`, `total_steps`, `device_type` |
| `advanced_macd_completed` | MACD 심화 완료 | `lesson_type: 'macd'`, `total_steps`, `device_type` |
| `advanced_fibonacci_started` | 피보나치 심화 시작 | `lesson_type: 'fibonacci'`, `total_steps`, `device_type` |
| `advanced_fibonacci_completed` | 피보나치 심화 완료 | `lesson_type: 'fibonacci'`, `total_steps`, `device_type` |
| `advanced_step_viewed` | 심화 학습 각 단계 진입 | `topic: 'rsi' \| 'macd' \| 'fibonacci'`, `step`, `step_id`, `total_steps` |

---

### 4-4. 실전 챌린지

| 이벤트 | 발화 시점 | Properties |
|---|---|---|
| `simulation_started` | 실전 챌린지 페이지 진입 | `device_type` |
| `challenge_started` | "분석 완료 — 예측하기" 클릭 | `active_indicators_count` |
| `challenge_prediction_submitted` | 예측 방향 선택 | `prediction: 'up' \| 'down' \| 'sideways'`, `active_indicators_count` |
| `challenge_completed` | 결과 공개 | `prediction`, `is_correct`, `actual_change`, `active_indicators_count`, `future_days` |
| `simulation_completed` | 결과 공개 (challenge_completed와 동시) | `prediction`, `is_correct`, `actual_change`, `device_type` |
| `simulation_retry` | "다른 구간 도전" 클릭 | `retry_count` |

---

### 4-5. 도구 사용

| 이벤트 | 발화 시점 | Properties |
|---|---|---|
| `indicator_enabled` | MA · RSI · MACD · BB **활성화** 시 | `indicator: 'MA' \| 'RSI' \| 'MACD' \| 'BB'` |
| `drawing_tool_used` | 추세선 · 피보나치 **활성화** 시 | `tool: 'trendline' \| 'fibonacci'` |
| `indicator_learn_more_opened` | "지표 더 알아보기" 링크 클릭 | `indicator` |

---

## 5. 퍼널 구조

사용자가 거치는 학습 여정을 퍼널로 분석할 수 있습니다.

```
[1] 홈 진입           $pageview (/)
         ↓
[2] CTA 클릭          landing_cta_clicked
         ↓
[3] 튜토리얼 시작      tutorial_started
         ↓
[4] 튜토리얼 완료      tutorial_completed
         ↓
[5] 심화 학습 진입     advanced_learning_opened
         ↓
[6] 심화 학습 시작     advanced_*_started
         ↓
[7] 심화 학습 완료     advanced_*_completed
         ↓
[8] 챌린지 진입        simulation_started
         ↓
[9] 예측 완료          challenge_completed
```

각 단계 사이의 이탈률을 GA4 Explore / PostHog Funnels에서 측정할 수 있습니다.

---

## 6. 분석 시나리오

### 이탈 구간 파악

`tutorial_step_viewed` 이벤트의 step별 사용자 수를 비교합니다.

```
step 1: 100명
step 2:  95명
step 3:  91명
step 4:  43명   ← 이탈 급증 → 4단계 UX 개선 필요
step 5:  40명
```

### 학습 난이도 측정

`tutorial_judgment_answered`의 `is_correct` 값을 step_id별로 집계합니다.

```
step_id: 'trend-basic'    정답률 91%   → 쉬움
step_id: 'rsi-overbought' 정답률 72%   → 보통
step_id: 'macd-golden'    정답률 38%   → 어려움 → 설명 개선 필요
```

### 챌린지 몰입도 측정

`simulation_retry`의 `retry_count` 분포를 확인합니다.

```
retry_count 1: 48%   → 절반은 한 번 더 도전
retry_count 2: 21%
retry_count 3+: 9%   → 높은 재도전율 = 높은 몰입도
```

### 도구 사용 선호도

`indicator_enabled`의 `indicator` 값을 집계합니다.

```
MA   68%   RSI  55%   MACD  31%   BB  22%
→ MACD·BB 는 사용률이 낮음 → 온보딩 개선 여지
```

---

## 7. PostHog Session Replay 활용

Session Replay는 이벤트와 자동으로 연결됩니다.  
아래 필터를 이용해 특정 행동의 녹화 영상을 추출할 수 있습니다.

| 분석 목적 | Recordings 필터 조건 |
|---|---|
| MACD 문제를 틀린 사용자의 행동 | `tutorial_judgment_answered` where `step_id contains 'macd'` AND `is_correct = false` |
| 4단계에서 이탈한 사용자 | `tutorial_step_viewed (step=4)` AND no `tutorial_step_viewed (step=5)` |
| 재도전을 3회 이상 한 사용자 | `simulation_retry` where `retry_count >= 3` |
| 튜토리얼 완료 후 챌린지까지 간 사용자 | `tutorial_completed` AND `challenge_completed` |

> **Session Replay 활성화 방법**  
> PostHog 대시보드 → Project Settings → Recordings → Enable session recording → ON  
> (코드 설정은 완료, 대시보드 토글만 켜면 됩니다)

---

## 8. 미수집 항목 (의도적 제외)

| 항목 | 제외 이유 |
|---|---|
| 개인 식별 정보 | 로그인·회원가입 없는 서비스 |
| 지표 비활성화 | 수집 중인 활성화 이벤트로 충분히 유추 가능 |
| 마우스 이동 / 스크롤 깊이 | autocapture 비활성화, 현재 MVP에서 불필요 |
| 페이지 체류 시간 | GA4 참여 시간, PostHog 세션 길이로 대체 |
