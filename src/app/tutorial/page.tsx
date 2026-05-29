'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

/* ── 15단계 여정 미리보기 ──────────────────────────────────── */
interface JourneyItem {
  icon: string; label: string; desc: string; badge: string; highlight?: boolean
}

const JOURNEY: JourneyItem[] = [
  {
    icon: '📊', label: '캔들 클릭',
    desc: '하루치 OHLC 데이터 직접 확인',
    badge: '직접 클릭',
  },
  {
    icon: '↗', label: '추세선 먼저 그리기',
    desc: '지표 없이 방향 감각 훈련',
    badge: '직접 그려요',
  },
  {
    icon: '📈', label: '이동평균선(MA)',
    desc: '방향을 선으로 확인 — 직접 켜봐요',
    badge: '토글',
  },
  {
    icon: '🤔', label: 'MA 추세 판단',
    desc: '실제 차트 보고 방향 스스로 판단',
    badge: '판단',
  },
  {
    icon: '🌡️', label: 'RSI',
    desc: '과열·과냉 구간 직접 읽기',
    badge: '토글',
  },
  {
    icon: '🔍', label: 'RSI 판단',
    desc: '현재 RSI 위치 파악',
    badge: '판단',
  },
  {
    icon: '🔄', label: 'MACD',
    desc: '추세 전환 신호 포착',
    badge: '토글',
  },
  {
    icon: '📡', label: 'MACD 판단',
    desc: '파란선·주황선 위치 분석',
    badge: '판단',
  },
  {
    icon: '〰️', label: '볼린저 밴드(BB)',
    desc: '변동성 폭 직접 관찰',
    badge: '토글',
  },
  {
    icon: '🔎', label: 'BB 판단',
    desc: '밴드 스퀴즈 vs 확장 구별',
    badge: '판단',
  },
  {
    icon: '𝚽', label: '피보나치 되돌림',
    desc: '지지/저항 구간 직접 표시',
    badge: '직접 그려요',
  },
  {
    icon: '📋', label: '종합 차트 읽기 테스트',
    desc: 'MA·RSI·MACD 종합 4문항 자동 채점',
    badge: '테스트',
    highlight: true,
  },
  {
    icon: '🎉', label: '튜토리얼 완료',
    desc: '나는 차트를 읽을 수 있다',
    badge: '축하',
  },
  {
    icon: '🔮', label: '시뮬레이션 안내',
    desc: '실제 데이터로 미래 예측 도전',
    badge: '안내',
  },
  {
    icon: '🚀', label: '첫 챌린지 시작',
    desc: '예측 → 결과 확인 → 성장',
    badge: '실전',
    highlight: true,
  },
]

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1] } },
}

const BADGE_COLORS: Record<string, string> = {
  '직접 클릭':   'bg-indigo-500/10 text-indigo-400',
  '직접 그려요': 'bg-amber-500/10 text-amber-400',
  '토글':        'bg-indigo-500/10 text-indigo-400',
  '판단':        'bg-purple-500/10 text-purple-400',
  '테스트':      'bg-emerald-500/10 text-emerald-400',
  '축하':        'bg-pink-500/10 text-pink-400',
  '안내':        'bg-sky-500/10 text-sky-400',
  '실전':        'bg-orange-500/10 text-orange-400',
}

export default function TutorialPage() {
  return (
    <main className="min-h-screen bg-navi-bg px-5 py-10 max-w-lg mx-auto flex flex-col">

      {/* 뒤로가기 */}
      <Link href="/" className="text-navi-muted text-sm hover:text-navi-text mb-10 self-start">
        ← 홈
      </Link>

      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                        bg-indigo-500/10 border border-indigo-500/25 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-indigo-400">
            읽기만 하는 설명 NO — 직접 해보는 튜토리얼
          </span>
        </div>

        <h1 className="text-2xl font-black text-navi-text leading-tight">
          "RSI를 배웠다"가<br />
          아니라<br />
          <span className="text-indigo-400">"차트를 읽을 수 있다"</span><br />
          는 느낌
        </h1>
        <p className="text-navi-muted text-sm mt-3 leading-relaxed">
          버튼을 켜고, 선을 그어보고, 직접 판단하면서<br />
          차트 읽기 능력이 쌓여요.
        </p>

        <div className="mt-4 flex items-center gap-3 text-xs text-navi-muted">
          <span>⏱ 약 7~10분</span>
          <span>·</span>
          <span>🎯 15단계 실전 체험</span>
          <span>·</span>
          <span>✅ 틀려도 괜찮아요</span>
        </div>
      </motion.div>

      {/* 여정 리스트 */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="space-y-1.5 mb-8"
      >
        {JOURNEY.map((step, i) => (
          <motion.div
            key={i}
            variants={ITEM}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 border transition-colors
              ${step.highlight
                ? 'bg-indigo-500/8 border-indigo-500/25'
                : 'bg-navi-surface border-navi-border'
              }`}
          >
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[10px] font-bold text-navi-muted w-4 text-right tabular-nums">
                {i + 1}
              </span>
              <span className="text-lg">{step.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-navi-text">{step.label}</p>
              <p className="text-[11px] text-navi-muted mt-0.5">{step.desc}</p>
            </div>

            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium
              ${BADGE_COLORS[step.badge] ?? 'bg-navi-border text-navi-muted'}`}>
              {step.badge}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* 핵심 강조 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mb-8 px-4 py-3.5 rounded-2xl bg-navi-surface border border-indigo-500/20"
      >
        <p className="text-xs text-indigo-300 leading-relaxed">
          💡 <strong>어떤 버튼을 눌러도 데이터는 사라지지 않아요.</strong>{' '}
          설명을 읽는 게 아니라 실제 차트 위에서 직접 클릭하고 판단하면서
          차트 읽기 능력이 자연스럽게 생겨요.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="space-y-3 mt-auto"
      >
        <Link
          href="/chart?onboard=1"
          className="w-full flex items-center justify-center gap-2 py-4
                     bg-gradient-to-r from-indigo-600 to-indigo-500
                     text-white font-bold text-sm rounded-2xl
                     hover:from-indigo-500 hover:to-indigo-400
                     shadow-lg shadow-indigo-500/25
                     transition-all active:scale-[0.98]"
        >
          <span>🚀</span>
          <span>튜토리얼 시작하기</span>
          <span className="text-indigo-200 text-xs font-normal ml-1">차트 위에서 바로 시작해요</span>
        </Link>

        <Link
          href="/chart"
          className="w-full flex items-center justify-center py-3
                     border border-navi-border rounded-2xl
                     text-xs text-navi-muted hover:text-navi-text
                     hover:border-navi-accent transition-colors"
        >
          건너뛰고 차트 바로 보기
        </Link>
      </motion.div>

    </main>
  )
}
