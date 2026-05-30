'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTutorialStore } from '@/stores/tutorialStore'

const ADDITIONAL = [
  { slug: 'fibonacci', label: '피보나치 되돌림' },
  { slug: 'rsi',       label: 'RSI 심화'       },
  { slug: 'macd',      label: 'MACD 심화'       },
]

export function TutorialMenuButton() {
  const { start } = useTutorialStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /* 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={[
          'h-7 px-3 text-[11px] font-semibold rounded-lg',
          'border transition-all duration-150',
          open
            ? 'bg-navi-action/18 border-navi-action/45 text-navi-text'
            : 'bg-navi-action/10 border-navi-action/25 text-navi-text hover:bg-navi-action/18 hover:border-navi-action/45',
        ].join(' ')}
      >
        학습
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-[240px]
                       bg-navi-surface border border-navi-border rounded-2xl
                       shadow-[0_16px_56px_rgba(0,0,0,0.6)]
                       z-50 overflow-hidden"
          >

            {/* ① 기초 과정 */}
            <div className="px-4 pt-4 pb-3.5 border-b border-navi-border">
              <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-1">
                기초 과정
              </p>
              <p className="text-[12px] text-navi-secondary mb-2.5">
                16단계 차트 읽기 입문
              </p>
              <button
                onClick={() => { start(); setOpen(false) }}
                className="w-full py-2 rounded-xl
                           text-[12px] font-semibold
                           bg-navi-action text-white
                           hover:bg-navi-action-hover
                           transition-all active:scale-[0.98]"
              >
                시작하기
              </button>
            </div>

            {/* ② 추가 학습 */}
            <div className="px-4 pt-3.5 pb-3.5 border-b border-navi-border">
              <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-2">
                추가 학습
              </p>
              <div className="space-y-0.5">
                {ADDITIONAL.map(({ slug, label }) => (
                  <Link
                    key={slug}
                    href={`/indicator/${slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between
                               px-2.5 py-2 rounded-xl
                               text-[12px] text-navi-secondary
                               hover:bg-navi-surface2 hover:text-navi-text
                               transition-all duration-100"
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-navi-muted">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* ③ 실전 챌린지 */}
            <div className="px-4 pt-3.5 pb-4">
              <p className="text-[9.5px] font-bold text-navi-muted uppercase tracking-[0.09em] mb-1">
                실전 챌린지
              </p>
              <p className="text-[12px] text-navi-secondary mb-2.5">
                챌린지 사용법 다시 보기
              </p>
              <Link
                href="/simulate?guide=1"
                onClick={() => setOpen(false)}
                className="block w-full py-2 rounded-xl
                           text-[12px] font-semibold text-center
                           border border-navi-border2 text-navi-text
                           hover:border-navi-action/40 hover:bg-navi-action/[0.06]
                           transition-all duration-150"
              >
                시작하기
              </Link>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
