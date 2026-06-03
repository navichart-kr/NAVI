import { notFound } from 'next/navigation'
import Link from 'next/link'
import { indicators } from '@/data/indicators'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { RoundedCard } from '@/components/ui/RoundedCard'
import { MiniChartPreview } from '@/components/chart/MiniChartPreview'
import { IndicatorPageTracker, IndicatorCTAButton } from '@/components/analytics/IndicatorPageEvents'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return Object.keys(indicators).map((slug) => ({ slug }))
}

// ── 설명 텍스트 렌더러 ───────────────────────────────────
// \n\n 단락 분리, 단락 내 • 로 시작하는 줄은 리스트로 처리
function DescBlock({ text }: { text: string }) {
  const paras = text.trim().split('\n\n')
  return (
    <div className="space-y-4">
      {paras.map((para, i) => {
        const lines       = para.split('\n')
        const bulletLines = lines.filter(l => l.trimStart().startsWith('•'))
        const textLines   = lines.filter(l => !l.trimStart().startsWith('•'))

        if (bulletLines.length > 0) {
          return (
            <div key={i} className="space-y-2">
              {textLines.map((l, j) =>
                l.trim() ? (
                  <p key={j} className="text-[13px] font-semibold text-navi-text leading-snug">
                    {l}
                  </p>
                ) : null
              )}
              <ul className="space-y-1.5 pt-0.5">
                {bulletLines.map((l, j) => (
                  <li key={j} className="flex gap-2 text-[13px] leading-relaxed">
                    <span className="text-navi-muted shrink-0 font-bold mt-px">•</span>
                    <span className="text-navi-text">{l.replace(/^[\s•]+/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        return (
          <p key={i} className="text-[13px] text-navi-text leading-[1.9] tracking-wide">
            {para}
          </p>
        )
      })}
    </div>
  )
}

// ── howToRead 한 항목 렌더러 ─────────────────────────────
// "조건 → 의미" 형태로 분리해 조건은 굵게, 의미는 muted 처리
function ReadItem({ text, index }: { text: string; index: number }) {
  const arrow = text.indexOf('→')
  const cond  = arrow > -1 ? text.slice(0, arrow).trim() : text
  const mean  = arrow > -1 ? text.slice(arrow + 1).trim() : ''

  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-navi-surface3 text-navi-secondary
                       text-[11px] font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold text-navi-text">{cond}</span>
        {mean && (
          <>
            <span className="text-navi-muted font-bold mx-1.5">→</span>
            <span className="text-navi-muted">{mean}</span>
          </>
        )}
      </p>
    </li>
  )
}

// ── 섹션 레이블 ──────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-navi-muted uppercase tracking-[0.12em] mb-4">
      {children}
    </p>
  )
}

export default function IndicatorDetailPage({ params }: Props) {
  const indicator = indicators[params.slug]
  if (!indicator) notFound()

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">

      {/* 페이지 진입 이벤트 추적 */}
      <IndicatorPageTracker indicator={indicator.slug} difficulty={indicator.difficulty} />

      {/* 뒤로가기 */}
      <Link href="/chart" className="text-navi-muted text-sm hover:text-navi-text">
        ← 차트로 돌아가기
      </Link>

      {/* ── 헤더 ── */}
      <div className="mt-7 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-navi-text leading-tight">
            {indicator.name}
          </h1>
          <DifficultyBadge level={indicator.difficulty} />
        </div>
        <p className="text-navi-secondary text-[15px] font-medium leading-snug mt-1">
          {indicator.oneLineSummary}
        </p>
      </div>

      <div className="space-y-4">

        {/* ── 차트 예시 ── */}
        <RoundedCard>
          <SectionLabel>실제 차트 예시 · NVDA 최근 데이터</SectionLabel>
          <MiniChartPreview slug={indicator.slug} />
        </RoundedCard>

        {/* ── 설명 ── */}
        <RoundedCard>
          <SectionLabel>이게 뭔가요?</SectionLabel>
          <DescBlock text={indicator.description} />
        </RoundedCard>

        {/* ── 읽는 법 ── */}
        <RoundedCard>
          <SectionLabel>어떻게 읽어요?</SectionLabel>
          <ol className="space-y-4">
            {indicator.howToRead.map((item, i) => (
              <ReadItem key={i} text={item} index={i} />
            ))}
          </ol>
        </RoundedCard>

        {/* ── 실전 팁 ── */}
        {indicator.tips && indicator.tips.length > 0 && (
          <RoundedCard>
            <SectionLabel>실전 팁</SectionLabel>
            <ul className="space-y-3">
              {indicator.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                  <span className="shrink-0 text-navi-muted font-bold mt-px">→</span>
                  <span className="text-navi-text">{tip}</span>
                </li>
              ))}
            </ul>
          </RoundedCard>
        )}

        {/* ── 주의할 점 ── */}
        {/* 주의 카드 = danger surface + border, 텍스트는 흰색 */}
        {indicator.caution && (
          <div className="rounded-2xl border border-navi-danger/25 bg-navi-danger/[0.08] px-5 py-4">
            <p className="text-[10px] font-bold text-navi-text uppercase tracking-[0.12em] mb-3">
              주의할 점
            </p>
            <p className="text-[13px] text-navi-secondary leading-[1.9] tracking-wide">
              {indicator.caution}
            </p>
          </div>
        )}

      </div>

      {/* ── CTA — 클릭 이벤트 추적 포함 ── */}
      <div className="mt-10">
        <IndicatorCTAButton indicator={indicator.slug} />
      </div>

    </main>
  )
}
