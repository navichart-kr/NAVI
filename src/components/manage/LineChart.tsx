'use client'

/**
 * 방문자 추이 SVG 라인 차트
 * - 기간 선택: 7일 / 30일 / 90일
 * - 방문자: #60A5FA (하늘색), 페이지뷰: #34D399 (민트)
 * - Hover 툴팁: 날짜 + 방문자 수 + 페이지뷰
 */

import { useState, useRef, useCallback } from 'react'

export interface TrendPoint {
  date:      string
  visitors:  number
  pageviews: number
  sessions:  number
}

interface Props {
  data: TrendPoint[]
}

const W   = 600
const H   = 150
const PAD = { top: 12, right: 12, bottom: 28, left: 44 }
const PW  = W - PAD.left - PAD.right
const PH  = H - PAD.top  - PAD.bottom

type Period = 7 | 30 | 90

function sx(i: number, n: number) {
  return PAD.left + (i / Math.max(n - 1, 1)) * PW
}
function sy(v: number, max: number) {
  return PAD.top + (1 - v / Math.max(max, 1)) * PH
}

function buildPath(pts: TrendPoint[], key: 'visitors' | 'pageviews', max: number) {
  if (pts.length < 2) return ''
  return pts
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i, pts.length).toFixed(1)},${sy(d[key], max).toFixed(1)}`)
    .join(' ')
}

function buildArea(pts: TrendPoint[], key: 'visitors' | 'pageviews', max: number) {
  if (pts.length < 2) return ''
  const line  = pts.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${sx(i, pts.length).toFixed(1)},${sy(d[key], max).toFixed(1)}`
  ).join(' ')
  const lastX = sx(pts.length - 1, pts.length).toFixed(1)
  const baseY = (PAD.top + PH).toFixed(1)
  const firstX = sx(0, pts.length).toFixed(1)
  return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`
}

export function LineChart({ data }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [hover,  setHover]  = useState<{ idx: number; d: TrendPoint } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const sliced = data.slice(-period)
  const n      = sliced.length
  const max    = Math.max(...sliced.map(d => d.pageviews), 1)

  const labelIdxs = n <= 7
    ? sliced.map((_, i) => i)
    : [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1]
      .filter((v, i, a) => a.indexOf(v) === i)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || n < 2) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const relX = svgX - PAD.left
    const idx  = Math.round((relX / PW) * (n - 1))
    if (idx < 0 || idx >= n) { setHover(null); return }
    setHover({ idx, d: sliced[idx] })
  }, [n, sliced])

  if (!data.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-[12px] text-navi-muted">데이터 없음</p>
      </div>
    )
  }

  const hoverX = hover ? sx(hover.idx, n) : 0

  return (
    <div className="space-y-3">
      {/* 기간 선택 탭 */}
      <div className="flex items-center gap-1.5">
        {([7, 30, 90] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setHover(null) }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              period === p
                ? 'bg-navi-action text-white'
                : 'text-navi-muted hover:text-navi-text hover:bg-navi-surface2'
            }`}
          >
            {p}일
          </button>
        ))}
        <span className="ml-auto text-[10px] text-navi-muted">
          {sliced.length > 0 && `${sliced[0].date.slice(5)} ~ ${sliced[sliced.length - 1].date.slice(5)}`}
        </span>
      </div>

      {/* SVG 차트 */}
      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[300px] cursor-crosshair"
          style={{ height: H }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* 그리드 수평선 */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <line
              key={t}
              x1={PAD.left} x2={W - PAD.right}
              y1={sy(max * t, max)} y2={sy(max * t, max)}
              stroke="#334155" strokeWidth="0.5"
            />
          ))}

          {/* 페이지뷰 영역 채우기 */}
          <path d={buildArea(sliced, 'pageviews', max)} fill="#34D399" opacity="0.07" />
          {/* 방문자 영역 채우기 */}
          <path d={buildArea(sliced, 'visitors',  max)} fill="#60A5FA" opacity="0.08" />

          {/* 페이지뷰 라인 */}
          <path
            d={buildPath(sliced, 'pageviews', max)}
            fill="none" stroke="#34D399" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* 방문자 라인 */}
          <path
            d={buildPath(sliced, 'visitors', max)}
            fill="none" stroke="#60A5FA" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* x축 레이블 */}
          {labelIdxs.map(i => (
            <text
              key={i}
              x={sx(i, n)} y={H - 4}
              textAnchor="middle" fontSize="9" fill="#CBD5E1"
            >
              {sliced[i]?.date.slice(5)}
            </text>
          ))}

          {/* y축 레이블 */}
          {[0, 0.5, 1].map(t => (
            <text
              key={t}
              x={PAD.left - 5}
              y={sy(max * t, max) + 4}
              textAnchor="end" fontSize="9" fill="#CBD5E1"
            >
              {Math.round(max * t).toLocaleString()}
            </text>
          ))}

          {/* Hover 세로 가이드라인 */}
          {hover && (
            <line
              x1={hoverX} x2={hoverX}
              y1={PAD.top} y2={PAD.top + PH}
              stroke="#CBD5E1" strokeWidth="1"
              strokeDasharray="3 3" opacity="0.4"
            />
          )}

          {/* Hover 포인트 */}
          {hover && (
            <>
              <circle
                cx={hoverX} cy={sy(hover.d.visitors,  max)}
                r="4" fill="#60A5FA" stroke="#0f172a" strokeWidth="2"
              />
              <circle
                cx={hoverX} cy={sy(hover.d.pageviews, max)}
                r="4" fill="#34D399" stroke="#0f172a" strokeWidth="2"
              />
            </>
          )}
        </svg>

        {/* Hover 툴팁 */}
        {hover && (() => {
          const leftPct = hoverX / W
          return (
            <div
              className="absolute top-1 z-20 pointer-events-none
                bg-[#1e2a3a] border border-[#334155] rounded-xl px-3 py-2.5 shadow-xl"
              style={{
                left:      leftPct < 0.65 ? `${leftPct * 100 + 2}%` : 'auto',
                right:     leftPct >= 0.65 ? `${(1 - leftPct) * 100 + 2}%` : 'auto',
                transform: 'translateY(4px)',
              }}
            >
              <p className="text-[11px] font-bold text-[#CBD5E1] mb-1.5">{hover.d.date}</p>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#60A5FA' }} />
                <span className="text-[10px] text-[#94a3b8]">방문자</span>
                <span className="text-[11px] font-bold text-white ml-1">
                  {hover.d.visitors.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#34D399' }} />
                <span className="text-[10px] text-[#94a3b8]">페이지뷰</span>
                <span className="text-[11px] font-bold text-white ml-1">
                  {hover.d.pageviews.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* 범례 */}
      <div className="flex gap-5 justify-end pr-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] rounded" style={{ background: '#60A5FA' }} />
          <span className="text-[10px] text-navi-muted">방문자</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] rounded" style={{ background: '#34D399' }} />
          <span className="text-[10px] text-navi-muted">페이지뷰</span>
        </div>
      </div>
    </div>
  )
}
