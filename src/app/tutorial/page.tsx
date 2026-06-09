'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

/* ── 4단계 학습 여정 (이모지 없음, 명확한 구조) ─────────── */
const PHASES = [
  {
    phase: '01',
    label: '차트 기초',
    steps: '캔들 클릭  ·  추세선 직접 그리기',
    highlight: false,
  },
  {
    phase: '02',
    label: '분석 도구 탐구',
    steps: '이동평균선  ·  RSI  ·  MACD  ·  볼린저 밴드',
    highlight: false,
  },
  {
    phase: '03',
    label: '종합 테스트',
    steps: '4문항 자동 채점',
    highlight: true,
  },
  {
    phase: '04',
    label: '실전 챌린지',
    steps: '실제 주식 데이터  ·  미래 30일 예측',
    highlight: true,
  },
]

export default function TutorialPage() {
  return (
    <main className="min-h-screen bg-navi-bg px-5 py-10 max-w-lg mx-auto flex flex-col">

      {/* 뒤로가기 */}
      <Link href="/" className="text-navi-muted text-[13px] hover:text-navi-text mb-12 self-start">
        ← 홈
      </Link>

      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10"
      >
        <h1 className="text-[28px] font-extrabold text-navi-text leading-[1.2] mb-4">
          "차트를 분석할 수 있다"<br />
          는 확신
        </h1>
        <p className="font-medium text-navi-secondary text-[15px] leading-relaxed mb-5">
          설명을 읽는 게 아니라 직접 클릭하고, 판단하면서<br />
          차트 분석 능력이 자연스럽게 쌓여요.
        </p>
        <div className="flex items-center gap-3 text-[13px] text-navi-secondary">
          <span>약 7~10분</span>
          <span className="w-1 h-1 rounded-full bg-navi-border2 shrink-0" />
          <span>16단계 실습</span>
          <span className="w-1 h-1 rounded-full bg-navi-border2 shrink-0" />
          <span>틀려도 괜찮아요</span>
        </div>
      </motion.div>

      {/* 학습 단계 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="mb-10"
      >
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-navi-secondary mb-4">
          학습 순서
        </p>
        <div className="space-y-2">
          {PHASES.map((p) => (
            <div
              key={p.phase}
              className={[
                'flex items-start gap-5 px-4 py-4 rounded-2xl border',
                p.highlight
                  ? 'bg-navi-surface2 border-navi-border2'
                  : 'bg-navi-surface border-navi-border',
              ].join(' ')}
            >
              {/* 단계 번호 */}
              <span className="text-[11px] font-bold text-navi-secondary tabular-nums shrink-0 mt-0.5 w-5 text-right">
                {p.phase}
              </span>

              {/* 내용 */}
              <div>
                <p className="text-[14px] font-bold text-navi-text leading-snug mb-1">
                  {p.label}
                </p>
                <p className="text-[12px] font-medium text-navi-secondary">{p.steps}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        className="space-y-3 mt-auto"
      >
        <Link
          href="/chart?onboard=1"
          className="w-full flex items-center justify-center h-[52px]
                     bg-navi-action text-white font-bold text-[15px]
                     rounded-xl border border-navi-action
                     hover:bg-navi-action-hover
                     transition-all duration-150 active:scale-[0.98]
                     shadow-[0_4px_20px_rgba(91,127,255,0.28)]"
        >
          튜토리얼 시작하기
        </Link>

        <Link
          href="/chart"
          className="w-full flex items-center justify-center h-11
                     border border-navi-border rounded-xl
                     text-[13px] text-navi-muted
                     hover:border-navi-border2 hover:text-navi-text
                     transition-all duration-150"
        >
          건너뛰고 차트 바로 보기
        </Link>
      </motion.div>

    </main>
  )
}
