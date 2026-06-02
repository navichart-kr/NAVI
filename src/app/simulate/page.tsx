'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SimulateChart }  from '@/components/simulate/SimulateChart'
import { ChallengeGuide } from '@/components/simulate/ChallengeGuide'
import { trackEvent }     from '@/lib/analytics'
import type { CandleData } from '@/types'

/* ─── 구간 설정 ──────────────────────────────────────────────── */
const PAST_DAYS   = 350  // 약 16개월 (분석 구간)
const FUTURE_DAYS =  30  // 약 1.5개월 (예측 구간)
const TOTAL_NEEDED = PAST_DAYS + FUTURE_DAYS

/** 랜덤(또는 시드 기반) 으로 past/future 를 잘라냄 */
function pickWindow(data: CandleData[], seed?: number) {
  if (data.length < TOTAL_NEEDED) {
    // 데이터 부족 시 마지막 부분을 최대한 사용
    const cutAt = Math.max(1, data.length - Math.floor(data.length * 0.3))
    return { past: data.slice(0, cutAt), future: data.slice(cutAt) }
  }
  const maxStart = data.length - TOTAL_NEEDED
  const start = seed !== undefined
    ? Math.abs(seed) % (maxStart + 1)
    : Math.floor(Math.random() * (maxStart + 1))
  return {
    past:   data.slice(start, start + PAST_DAYS),
    future: data.slice(start + PAST_DAYS, start + PAST_DAYS + FUTURE_DAYS),
  }
}

/* ── useSearchParams 는 Suspense 안에서만 사용 가능 ── */

/** ?guide=1 여부를 읽어 ChallengeGuide에 forceGuide 전달 */
function ChallengeGuideWrapper() {
  const searchParams = useSearchParams()
  const forceGuide   = searchParams.get('guide') === '1'
  return <ChallengeGuide forceGuide={forceGuide} />
}

function WelcomeBanner() {
  const searchParams = useSearchParams()
  const fromTutorial = searchParams.get('from') === 'tutorial'
  const [show, setShow] = useState(fromTutorial)
  if (!show) return null
  return (
    /* 튜토리얼 완료 = success 카드 (surface + border, 흰 텍스트) */
    <div className="mb-4 bg-navi-success/[0.08] border border-navi-success/25 rounded-2xl p-4 relative">
      <button
        onClick={() => setShow(false)}
        className="absolute top-3 right-3 text-navi-muted hover:text-navi-text text-lg leading-none"
      >×</button>
      <p className="text-sm font-bold text-navi-text mb-1">
        튜토리얼 완료 — 이제 진짜 시험이에요
      </p>
      <p className="text-xs text-navi-secondary leading-relaxed">
        방금 배운 MA·RSI·MACD·볼린저 밴드를 모두 사용할 수 있어요.
        분석 도구를 켜고 지표들을 종합해서 예측해봐요. 틀려도 완전히 괜찮아요!
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-navi-surface2 border border-navi-border2 text-navi-secondary">MA 추세 확인</span>
        <span className="px-2 py-0.5 rounded-full bg-navi-surface2 border border-navi-border2 text-navi-secondary">RSI 과열 체크</span>
        <span className="px-2 py-0.5 rounded-full bg-navi-surface2 border border-navi-border2 text-navi-secondary">MACD 모멘텀</span>
        <span className="px-2 py-0.5 rounded-full bg-navi-surface2 border border-navi-border2 text-navi-secondary">BB 변동성</span>
      </div>
    </div>
  )
}

export default function SimulatePage() {
  const [allData, setAllData] = useState<CandleData[]>([])
  const [past,    setPast]    = useState<CandleData[]>([])
  const [future,  setFuture]  = useState<CandleData[]>([])
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  /* ── 최초 데이터 fetch ───────────────────────────────────── */
  useEffect(() => {
    fetch('/api/candles?symbol=NVDA&period=ALL&timeUnit=daily')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: CandleData[]) => {
        setAllData(data)
        const { past, future } = pickWindow(data)
        setPast(past); setFuture(future)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  /* ── 다른 구간 선택 ─────────────────────────────────────── */
  const retry = useCallback(() => {
    if (allData.length === 0) return
    const { past, future } = pickWindow(allData)
    setPast(past); setFuture(future)
    setAttempt(a => {
      const newCount = a + 1
      /* ✦ 재도전 횟수 기록 — 학습 몰입도 측정 */
      trackEvent('simulation_retry', { retry_count: newCount })
      return newCount
    })
  }, [allData])

  /* ── 로딩 / 에러 ─────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navi-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-navi-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-navi-muted">NVDA 데이터 불러오는 중...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-navi-bg">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-navi-secondary">데이터를 불러오지 못했어요</p>
        <Link href="/chart" className="text-xs text-navi-muted hover:text-navi-text transition-colors">차트로 돌아가기</Link>
      </div>
    </div>
  )

  return (
    <>
      {/* ── 실전 챌린지 가이드 ────────────────────────────────── */}
      <Suspense fallback={null}>
        <ChallengeGuideWrapper />
      </Suspense>

      {/* ── 스티키 헤더 (차트 페이지와 동일 구조) ──────────────── */}
      <header className="sticky top-0 z-30 bg-navi-bg/94 backdrop-blur-md border-b border-navi-border"
              style={{ height: 52 }}>
        <div className="h-full max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between">
          <Link href="/chart"
            className="flex items-center gap-1.5 text-navi-muted hover:text-navi-text transition-colors">
            <span className="text-[13px]">←</span>
            <span className="text-[12px] font-medium hidden sm:inline">차트로 돌아가기</span>
          </Link>

          <div className="text-center">
            <p className="text-[13px] font-bold text-navi-text leading-tight">실전 챌린지</p>
            <p className="text-[10px] text-navi-muted">NVDA · 과거 차트 분석</p>
          </div>

          <button
            onClick={retry}
            className="text-[12px] font-medium text-navi-muted hover:text-navi-text
                       transition-colors px-2 py-1 rounded-lg
                       border border-transparent hover:border-navi-border">
            다른 구간
          </button>
        </div>
      </header>

      {/* ── 페이지 본문 ──────────────────────────────────────── */}
      <div className="min-h-screen bg-navi-bg px-3 sm:px-4 pt-3 sm:pt-5 pb-8 max-w-4xl mx-auto">

        {/* 튜토리얼 완료 환영 배너 (PC만, 모바일은 공간 낭비) */}
        <div className="hidden sm:block">
          <Suspense fallback={null}>
            <WelcomeBanner />
          </Suspense>
        </div>

        {/* 안내 배너 — 모바일: 한 줄 요약 / PC: 풀 버전 */}
        <div className="mb-3">
          {/* 모바일 간략 배너 */}
          <div className="sm:hidden flex items-center gap-2 px-3 py-2.5
                          bg-navi-surface border border-navi-border rounded-xl text-[11px]">
            <span className="text-amber-400 font-bold shrink-0">▶</span>
            <span className="text-navi-secondary">
              NVDA {PAST_DAYS}일 데이터로 이후 {FUTURE_DAYS}일을 예측해봐요
            </span>
          </div>
          {/* PC 풀 배너 */}
          <div className="hidden sm:block bg-navi-surface border border-navi-border rounded-2xl p-4">
            <p className="text-sm font-semibold text-navi-text mb-1.5">
              이 시점 이후, 차트는 어떻게 됐을까요?
            </p>
            <p className="text-xs text-navi-muted leading-relaxed">
              아래 차트는 NVDA의 실제 과거 {PAST_DAYS}일(약 {Math.round(PAST_DAYS / 21)}개월) 데이터예요.
              노란 점선 오른쪽의 {FUTURE_DAYS}일이 숨겨져 있어요.
              분석 도구·작도 도구를 활용해 예측한 뒤{' '}
              <span className="text-navi-text font-semibold">결과 보기</span>를 눌러보세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['분석 도구로 지표 추가', '작도 도구로 직접 그리기', '결과 보기로 정답 확인', '다른 구간으로 반복 연습'].map(t => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-navi-surface2 border border-navi-border2 text-navi-secondary">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 시뮬레이션 차트 */}
        {past.length > 0 && future.length > 0 && (
          <SimulateChart
            key={attempt}
            pastData={past}
            futureData={future}
            onRetry={retry}
          />
        )}
      </div>
    </>
  )
}
