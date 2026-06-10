'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTutorialStore } from '@/stores/tutorialStore'
import { useMobile }        from '@/hooks/useMobile'
import { trackEvent }       from '@/lib/analytics'

const ADDITIONAL = [
  { key: 'fibonacci-advanced', label: '피보나치 되돌림' },
  { key: 'rsi-advanced',       label: 'RSI 심화'       },
  { key: 'macd-advanced',      label: 'MACD 심화'       },
]

interface TutorialMenuButtonProps {
  /** 'sm' = 헤더용 소형 버튼 (기본) | 'lg' = 콘텐츠 영역용 전체 폭 버튼 */
  size?: 'sm' | 'lg'
}

export function TutorialMenuButton({ size = 'sm' }: TutorialMenuButtonProps) {
  const { start, startLesson } = useTutorialStore()
  const router   = useRouter()
  const isMobile = useMobile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /* 외부 클릭 시 닫기 — PC 드롭다운 전용 */
  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  /* 공통 학습 실행 핸들러 */
  function handleLesson(key: string) {
    if (typeof window !== 'undefined' && window.location.pathname === '/chart') {
      startLesson(key)
    } else {
      router.push(`/chart?lesson=${key}`)
    }
    setOpen(false)
  }

  /* ── 버튼 스타일 ─────────────────────────────────────── */
  const btnClass = [
    size === 'lg'
      ? 'w-full h-11 px-4 text-[13px] rounded-xl'
      : 'h-7 px-3 text-[11px] rounded-lg',
    'font-semibold border transition-all duration-150',
    open
      ? 'bg-navi-action/18 border-navi-action/45 text-navi-text'
      : 'bg-navi-action/10 border-navi-action/25 text-navi-text hover:bg-navi-action/18 hover:border-navi-action/45',
  ].join(' ')

  /* ── 메뉴 내부 콘텐츠 (PC 드롭다운 / 모바일 모달 공통) ── */
  const menuContent = (isMobileView: boolean) => (
    <>
      {/* ① 기초 과정 */}
      <div className={`border-b border-navi-border ${isMobileView ? 'px-5 pt-4 pb-4' : 'px-4 pt-4 pb-3.5'}`}>
        <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-1">
          기초 과정
        </p>
        <p className={`font-medium text-navi-secondary mb-2.5 ${isMobileView ? 'text-[13px]' : 'text-[12px]'}`}>
          15단계 차트 읽기 입문
        </p>
        <button
          onClick={() => { start(); setOpen(false) }}
          className={`w-full rounded-xl font-semibold bg-navi-action text-white
                      hover:bg-navi-action-hover transition-all active:scale-[0.98]
                      ${isMobileView ? 'py-3 text-[13px]' : 'py-2 text-[12px]'}`}
        >
          시작하기
        </button>
      </div>

      {/* ② 추가 학습 */}
      <div className={`border-b border-navi-border ${isMobileView ? 'px-5 pt-3.5 pb-3.5' : 'px-4 pt-3.5 pb-3.5'}`}>
        <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-2">
          추가 학습
        </p>
        <div className="space-y-0.5">
          {ADDITIONAL.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleLesson(key)}
              className={`flex items-center justify-between w-full rounded-xl
                          text-navi-secondary hover:bg-navi-surface2 hover:text-navi-text
                          transition-all duration-100
                          ${isMobileView ? 'px-3 py-3 text-[13px]' : 'px-2.5 py-2 text-[12px]'}`}
            >
              <span>{label}</span>
              <span className="text-[10px] text-navi-muted">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* ③ 실전 챌린지 */}
      <div className={isMobileView ? 'px-5 pt-3.5 pb-5' : 'px-4 pt-3.5 pb-4'}>
        <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-1">
          실전 챌린지
        </p>
        <p className={`font-medium text-navi-secondary mb-2.5 ${isMobileView ? 'text-[13px]' : 'text-[12px]'}`}>
          챌린지 사용법 다시 보기
        </p>
        <Link
          href="/simulate?guide=1"
          onClick={() => setOpen(false)}
          className={`block w-full rounded-xl font-semibold text-center
                      border border-navi-border2 text-navi-text
                      hover:border-navi-action/40 hover:bg-navi-action/[0.06]
                      transition-all duration-150
                      ${isMobileView ? 'py-3 text-[13px]' : 'py-2 text-[12px]'}`}
        >
          시작하기
        </Link>
      </div>
    </>
  )

  return (
    <div ref={ref} className={`relative ${size === 'lg' ? 'w-full' : ''}`}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => {
          // 열릴 때만 이벤트 전송 (닫힘 → 열림 전환)
          if (!open) trackEvent('advanced_learning_opened')
          setOpen(v => !v)
        }}
        className={btnClass}>
        학습
      </button>

      <AnimatePresence>
        {open && (
          isMobile ? (
            /* ════ 모바일: 전체화면 모달 오버레이 ════ */
            <motion.div
              key="mobile-modal-backdrop"
              className="fixed inset-0 z-[100] flex items-center px-4"
              style={{ background: 'rgba(0,0,0,0.65)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                key="mobile-modal-panel"
                className="w-full rounded-2xl bg-navi-surface border border-navi-border
                           shadow-[0_24px_64px_rgba(0,0,0,0.75)] overflow-hidden"
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.93, y: 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-navi-border">
                  <span className="text-[15px] font-bold text-navi-text">학습 선택</span>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full
                               bg-navi-surface3 border border-navi-border2
                               text-[13px] text-navi-muted
                               hover:bg-navi-surface2 hover:text-navi-text
                               transition-all active:scale-90"
                  >
                    ✕
                  </button>
                </div>
                {menuContent(true)}
              </motion.div>
            </motion.div>
          ) : (
            /* ════ PC: 기존 드롭다운 ════ */
            <motion.div
              key="pc-dropdown"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-[240px]
                         bg-navi-surface border border-navi-border rounded-2xl
                         shadow-[0_16px_56px_rgba(0,0,0,0.6)]
                         z-50 overflow-hidden"
            >
              {menuContent(false)}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
