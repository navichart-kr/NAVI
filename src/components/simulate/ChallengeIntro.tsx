'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'navi-challenge-intro-seen'

interface Props {
  /** true 이면 localStorage 무관하게 항상 표시 (?guide=1 진입 시) */
  forceGuide?: boolean
}

export function ChallengeIntro({ forceGuide = false }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null
    if (!seen || forceGuide) setShow(true)
  }, [forceGuide])

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-navi-bg/97 backdrop-blur-md
                     flex items-center justify-center px-5 py-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[340px]"
          >
            {/* 레이블 */}
            <span className="text-[10px] font-bold text-navi-action uppercase tracking-[0.1em]">
              실전 챌린지
            </span>

            {/* 헤드라인 */}
            <h2 className="text-[24px] font-black text-navi-text leading-tight mt-2 mb-3">
              실제 과거 차트로<br />미래를 예측해봐요
            </h2>

            {/* 설명 */}
            <p className="text-[13px] text-navi-secondary leading-relaxed mb-5">
              NVDA 과거 데이터 약 16개월이 주어져요.<br />
              노란 점선 이후 30일이 숨겨져 있어요.<br />
              분석 도구를 켜고 예측한 뒤 결과를 확인해봐요.
            </p>

            {/* 흐름 시각화 */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { num: '01', label: '분석', desc: '지표·작도 활용' },
                { num: '02', label: '예측', desc: '상승·횡보·하락' },
                { num: '03', label: '확인', desc: '실제 결과 공개' },
              ].map(({ num, label, desc }) => (
                <div key={num}
                  className="flex flex-col items-center gap-1 px-2 py-3
                             bg-navi-surface border border-navi-border rounded-xl">
                  <span className="text-[9px] font-bold text-navi-muted tabular-nums">{num}</span>
                  <span className="text-[13px] font-bold text-navi-text">{label}</span>
                  <span className="text-[10px] text-navi-muted text-center leading-tight">{desc}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <button
                onClick={dismiss}
                className="w-full h-[50px] flex items-center justify-center
                           bg-navi-action text-white font-bold text-[14px]
                           rounded-xl
                           shadow-[0_4px_20px_rgba(91,127,255,0.28)]
                           hover:bg-navi-action-hover transition-all active:scale-[0.98]"
              >
                시작하기
              </button>
              <button
                onClick={dismiss}
                className="w-full py-2.5 text-[12px] font-medium text-navi-muted
                           hover:text-navi-text transition-colors"
              >
                건너뛰기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
