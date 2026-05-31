'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { MobileBottomSheet } from './MobileBottomSheet'
import { useChartStore } from '@/stores/chartStore'
import { useTutorialStore } from '@/stores/tutorialStore'
import type { IndicatorSlug } from '@/types'

/* ── 타입 ───────────────────────────────────────────────── */
type Sheet = 'analysis' | 'drawing' | 'learning' | null

/* ── 데이터 ──────────────────────────────────────────────── */
const ANALYSIS_ITEMS: { slug: IndicatorSlug; label: string; name: string }[] = [
  { slug: 'moving-average', label: 'MA',   name: '이동평균선' },
  { slug: 'rsi',            label: 'RSI',  name: 'RSI 지수'  },
  { slug: 'macd',           label: 'MACD', name: 'MACD 지표' },
  { slug: 'bollinger',      label: 'BB',   name: '볼린저밴드' },
]

const DRAWING_ITEMS = [
  { value: 'trendline' as const, label: '추세선',   icon: '↗', desc: '저점·고점 연결로 추세 표시' },
  { value: 'fibonacci' as const, label: '피보나치', icon: '𝚽', desc: '고점→저점 클릭 시 레벨 표시' },
]

const LESSON_ITEMS = [
  { key: 'fibonacci-advanced', label: '피보나치 추가 학습' },
  { key: 'rsi-advanced',       label: 'RSI 심화 학습'      },
  { key: 'macd-advanced',      label: 'MACD 심화 학습'     },
]

/* ════════════════════════════════════════════════════════ */
export function MobileBottomBar() {
  const [sheet, setSheet] = useState<Sheet>(null)

  const { activeIndicators, toggleIndicator, drawingTool, setDrawingTool } = useChartStore()
  const { isActive: tutorialActive, start, startLesson } = useTutorialStore()
  const router = useRouter()

  const close  = ()          => setSheet(null)
  const toggle = (s: Sheet)  => setSheet(prev => prev === s ? null : s)

  const isDrawing = drawingTool === 'trendline' || drawingTool === 'fibonacci'

  /* 튜토리얼 진행 중에는 bottom bar 숨김 */
  if (tutorialActive) return null

  return (
    <>
      {/* ── 작도 모드 활성 배너 ────────────────────────────── */}
      {isDrawing && (
        <div className="fixed bottom-14 left-0 right-0 z-30 px-3"
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-amber-500/[0.12] border border-amber-500/30 rounded-xl
                          px-4 py-2 flex items-center gap-3">
            <span className="text-amber-400 text-sm animate-pulse leading-none">●</span>
            <span className="text-[12px] font-semibold text-navi-text flex-1 leading-snug">
              {drawingTool === 'trendline'
                ? '추세선 — 차트에서 두 점을 클릭하세요'
                : '피보나치 — 차트에서 두 점을 클릭하세요'}
            </span>
            <button
              onClick={() => setDrawingTool('none')}
              className="text-[11px] text-navi-muted hover:text-navi-text
                         transition-colors px-2 py-0.5 rounded-md border border-navi-border shrink-0"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 고정 하단 툴바 ───────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40
                   bg-navi-surface/96 backdrop-blur-md border-t border-navi-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-14 max-w-5xl mx-auto">

          {/* 분석 */}
          <button
            id="mobile-toolbar-analysis"
            onClick={() => toggle('analysis')}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors',
              sheet === 'analysis' ? 'text-navi-action' : 'text-navi-muted',
            )}
          >
            <AnalysisIcon />
            <span className="text-[10px] font-medium">분석</span>
            {activeIndicators.size > 0 && (
              <span className="absolute top-2 right-[calc(50%-16px)]
                               w-1.5 h-1.5 rounded-full bg-navi-action" />
            )}
          </button>

          {/* 작도 */}
          <button
            id="mobile-toolbar-drawing"
            onClick={() => toggle('drawing')}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors',
              sheet === 'drawing' || isDrawing ? 'text-amber-400' : 'text-navi-muted',
            )}
          >
            <DrawingIcon />
            <span className="text-[10px] font-medium">작도</span>
            {isDrawing && (
              <span className="absolute top-2 right-[calc(50%-16px)]
                               w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* 학습 */}
          <button
            id="mobile-toolbar-learning"
            onClick={() => toggle('learning')}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
              sheet === 'learning' ? 'text-navi-action' : 'text-navi-muted',
            )}
          >
            <LearningIcon />
            <span className="text-[10px] font-medium">학습</span>
          </button>

        </div>
      </div>

      {/* ════ 분석 도구 Bottom Sheet ══════════════════════════ */}
      <MobileBottomSheet
        open={sheet === 'analysis'}
        onClose={close}
        title="분석 도구"
        maxHeight="56vh"
      >
        <div className="p-3.5 pb-6 space-y-2.5">
          <p className="text-[11px] text-navi-muted">켜면 차트에 표시돼요 · 다시 누르면 꺼져요</p>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSIS_ITEMS.map(({ slug, label, name }) => {
              const active = activeIndicators.has(slug)
              return (
                <button
                  key={slug}
                  id={`mobile-btn-${slug}`}
                  onClick={() => { toggleIndicator(slug); close() }}
                  className={clsx(
                    'flex items-center gap-2.5 px-3.5 py-3.5 rounded-2xl border-2',
                    'transition-all active:scale-[0.96]',
                    active
                      ? 'border-navi-action bg-navi-action/10'
                      : 'border-navi-border bg-navi-surface2',
                  )}
                >
                  <span className={clsx(
                    'text-[14px] font-bold w-9 text-center shrink-0 leading-none',
                    active ? 'text-navi-action' : 'text-navi-secondary',
                  )}>
                    {label}
                  </span>
                  <span className={clsx(
                    'text-[12px] text-left leading-tight',
                    active ? 'text-navi-text font-medium' : 'text-navi-secondary',
                  )}>
                    {name}
                  </span>
                </button>
              )
            })}
          </div>
          {activeIndicators.size > 0 && (
            <p className="text-center text-[11px] text-navi-muted">
              {activeIndicators.size}개 활성화됨 — 다시 탭하면 꺼져요
            </p>
          )}
        </div>
      </MobileBottomSheet>

      {/* ════ 작도 도구 Bottom Sheet ══════════════════════════ */}
      <MobileBottomSheet
        open={sheet === 'drawing'}
        onClose={close}
        title="작도 도구"
        maxHeight="56vh"
      >
        <div className="p-3.5 pb-6 space-y-2">
          <p className="text-[11px] text-navi-muted">선택하면 차트에서 직접 그릴 수 있어요</p>
          {DRAWING_ITEMS.map(tool => {
            const active = drawingTool === tool.value
            return (
              <button
                key={tool.value}
                id={`mobile-drawing-${tool.value}`}
                onClick={() => {
                  setDrawingTool(active ? 'none' : tool.value)
                  if (!active) close()
                }}
                className={clsx(
                  'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2',
                  'transition-all active:scale-[0.97]',
                  active
                    ? 'border-amber-500/50 bg-amber-500/[0.08]'
                    : 'border-navi-border bg-navi-surface2',
                )}
              >
                <span className={clsx(
                  'text-[18px] w-7 text-center shrink-0',
                  active && 'animate-pulse',
                )}>
                  {tool.icon}
                </span>
                <div className="text-left flex-1">
                  <p className={clsx(
                    'text-[13px] font-semibold',
                    active ? 'text-amber-400' : 'text-navi-text',
                  )}>
                    {tool.label}
                  </p>
                  <p className="text-[11px] text-navi-muted mt-0.5">{tool.desc}</p>
                </div>
                {active && (
                  <span className="shrink-0 text-[10px] font-bold
                                   text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">
                    진행 중
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => { setDrawingTool('erase'); close() }}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2
                       border-navi-border bg-navi-surface2 transition-all active:scale-[0.97]"
          >
            <span className="text-[18px] w-7 text-center shrink-0 text-navi-muted">✕</span>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-navi-text">전체 삭제</p>
              <p className="text-[11px] text-navi-muted mt-0.5">그린 선을 모두 지워요</p>
            </div>
          </button>
        </div>
      </MobileBottomSheet>

      {/* ════ 학습 Bottom Sheet ═══════════════════════════════ */}
      <MobileBottomSheet
        open={sheet === 'learning'}
        onClose={close}
        title="학습"
        maxHeight="78vh"
      >
        <div className="p-3.5 pb-10 space-y-4">

          {/* 기초 과정 */}
          <div>
            <p className="text-[10px] font-bold text-navi-muted uppercase
                          tracking-[0.08em] mb-2">기초 과정</p>
            <button
              onClick={() => { start(); close() }}
              className="w-full py-3.5 rounded-2xl text-[13px] font-bold
                         bg-navi-action text-white hover:bg-navi-action-hover
                         transition-all active:scale-[0.97]
                         shadow-[0_4px_20px_rgba(91,127,255,0.25)]"
            >
              기초 튜토리얼 시작하기
            </button>
            <p className="text-center text-[11px] text-navi-muted mt-1.5">
              약 7~10분 · 16단계 · 틀려도 괜찮아요
            </p>
          </div>

          {/* 추가 학습 */}
          <div>
            <p className="text-[10px] font-bold text-navi-muted uppercase
                          tracking-[0.08em] mb-2">추가 학습</p>
            <div className="space-y-1.5">
              {LESSON_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.location.pathname === '/chart') {
                      startLesson(key)
                    } else {
                      router.push(`/chart?lesson=${key}`)
                    }
                    close()
                  }}
                  className="w-full flex items-center justify-between
                             px-3.5 py-3 rounded-xl border border-navi-border
                             bg-navi-surface2 hover:bg-navi-surface3
                             transition-all active:scale-[0.97]"
                >
                  <span className="text-[13px] font-medium text-navi-text">{label}</span>
                  <span className="text-navi-muted text-[11px]">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* 실전 챌린지 */}
          <div>
            <p className="text-[10px] font-bold text-navi-muted uppercase
                          tracking-[0.08em] mb-2">실전 챌린지</p>
            <div className="space-y-1.5">
              {/* 바로 진입 */}
              <Link
                href="/simulate"
                onClick={close}
                className="flex items-center justify-between w-full
                           px-3.5 py-3.5 rounded-2xl
                           bg-navi-surface border-2 border-navi-border2
                           text-navi-text hover:border-navi-action/40
                           hover:bg-navi-action/[0.06]
                           transition-all active:scale-[0.97]"
              >
                <div>
                  <p className="text-[13px] font-bold">실전 챌린지 시작</p>
                  <p className="text-[11px] text-navi-muted mt-0.5">NVDA 실제 과거 데이터로 예측해봐요</p>
                </div>
                <span className="text-navi-action text-[14px] font-bold">→</span>
              </Link>
              {/* 가이드 포함 진입 */}
              <Link
                href="/simulate?guide=1"
                onClick={close}
                className="flex items-center justify-between w-full
                           px-3.5 py-3 rounded-xl border border-navi-border
                           bg-navi-surface2 text-navi-secondary
                           hover:bg-navi-surface3 hover:text-navi-text
                           transition-all active:scale-[0.97]"
              >
                <span className="text-[12px]">사용법 가이드와 함께 시작</span>
                <span className="text-[11px]">→</span>
              </Link>
            </div>
          </div>

        </div>
      </MobileBottomSheet>
    </>
  )
}

/* ── SVG 아이콘 ──────────────────────────────────────────── */
function AnalysisIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 15L7.5 9.5L11.5 12.5L18.5 5.5"
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7.5" cy="9.5" r="1.4" fill="currentColor"/>
      <circle cx="11.5" cy="12.5" r="1.4" fill="currentColor"/>
      <circle cx="18.5" cy="5.5" r="1.4" fill="currentColor"/>
    </svg>
  )
}

function DrawingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 18L8.5 13.5L15.5 6.5L17.5 8.5L10.5 15.5L6 18H4Z"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.5 8.5L15.5 6.5"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round"/>
    </svg>
  )
}

function LearningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 4L19 8L11 12L3 8L11 4Z"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10.5V15C7 15 9 17 11 17C13 17 15 15 15 15V10.5"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="19" y1="8" x2="19" y2="14"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round"/>
    </svg>
  )
}
