'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useTutorialStore } from '@/stores/tutorialStore'

const ADDITIONAL_LEARNING = [
  { key: 'fibonacci-advanced', label: '피보나치 되돌림' },
  { key: 'rsi-advanced',       label: 'RSI 심화'       },
  { key: 'macd-advanced',      label: 'MACD 심화'       },
]

export function TutorialComplete() {
  const { showCompletionScreen, dismissCompletion, startLesson } = useTutorialStore()

  return (
    <AnimatePresence>
      {showCompletionScreen && (
        <motion.div
          key="tutorial-complete-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[60] bg-navi-bg/97 backdrop-blur-md
                     flex items-center justify-center px-5 py-10 overflow-y-auto"
        >
          <motion.div
            key="tutorial-complete-card"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[360px]"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={dismissCompletion}
              className="absolute top-0 right-0
                         w-8 h-8 flex items-center justify-center rounded-xl
                         bg-navi-surface2 border border-navi-border
                         text-[13px] text-navi-muted hover:text-navi-text
                         transition-colors"
            >
              
            </button>

            {/* 완료 헤더 */}
            <div className="text-center mb-7 pt-1">
              <div className="inline-flex items-center justify-center
                              w-11 h-11 rounded-2xl mb-4
                              bg-navi-success/[0.10] border border-navi-success/25">
                <span className="text-[16px] font-black text-navi-text"></span>
              </div>
              <h2 className="text-[22px] font-black text-navi-text leading-tight mb-2">
                기초 과정 완료
              </h2>
              <p className="text-[13px] font-medium text-navi-secondary leading-relaxed">
                캔들부터 종합 분석까지 모두 경험했어요.<br />
                이제 무엇을 해볼까요?
              </p>
            </div>

            {/* 3가지 선택지 */}
            <div className="space-y-2.5">

              {/* ① 실전 챌린지 — 1순위 Action */}
              <Link
                href="/simulate"
                onClick={dismissCompletion}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl
                           bg-navi-action text-white
                           hover:bg-navi-action-hover
                           transition-all duration-150 active:scale-[0.98]
                           shadow-[0_4px_20px_rgba(91,127,255,0.28)]"
              >
                <div className="shrink-0 w-9 h-9 rounded-xl bg-white/15
                                flex items-center justify-center
                                text-[15px] font-black leading-none">
                  →
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-bold leading-snug">실전 챌린지</p>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    실제 과거 차트로 미래를 예측해봐요
                  </p>
                </div>
              </Link>

              {/* ② 추가 학습 — 2순위 Surface */}
              <div className="px-4 py-4 rounded-2xl bg-navi-surface border border-navi-border">
                <p className="text-[10px] font-semibold text-navi-muted
                              uppercase tracking-[0.09em] mb-3">
                  추가 학습
                </p>
                <div className="space-y-1.5">
                  {ADDITIONAL_LEARNING.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { dismissCompletion(); startLesson(key) }}
                      className="flex items-center justify-between w-full
                                 px-3 py-2.5 rounded-xl
                                 bg-navi-surface2 border border-navi-border
                                 text-[12px] font-medium text-navi-secondary
                                 hover:border-navi-accent/40 hover:text-navi-text
                                 transition-all duration-150"
                    >
                      <span>{label}</span>
                      <span className="text-navi-muted text-[11px]">→</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ③ 차트 분석 — 3순위 Ghost */}
              <button
                onClick={dismissCompletion}
                className="w-full py-3 rounded-2xl
                           text-[12px] font-medium text-navi-muted
                           border border-navi-border
                           hover:border-navi-border2 hover:text-navi-text
                           transition-all duration-150"
              >
                차트 직접 분석하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
