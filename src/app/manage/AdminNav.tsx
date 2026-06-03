'use client'

import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'KPI',      href: '#kpi'        },
  { label: '추이',     href: '#trend'      },
  { label: '퍼널',     href: '#funnel'     },
  { label: '튜토리얼', href: '#steps'      },
  { label: '퀴즈',     href: '#quiz'       },
  { label: '심화',     href: '#advanced'   },
  { label: '더알아보기', href: '#learnmore' },
  { label: '챌린지',   href: '#challenge'  },
  { label: '재도전',   href: '#retry'      },
  { label: '지표활용', href: '#indicators' },
  { label: '캔들학습', href: '#candle'     },
  { label: '거래량',   href: '#volume'     },
  { label: '로그',     href: '#log'        },
]

export function AdminNav() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/manage/logout', { method: 'POST' })
    router.replace('/manage/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-navi-bg/95 backdrop-blur-md border-b border-navi-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* 브랜드 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-black tracking-[0.10em] uppercase text-navi-action">NAVI</span>
          <span className="text-[10px] text-navi-muted font-semibold">Admin</span>
        </div>

        {/* 섹션 네비 (데스크탑) */}
        <nav className="hidden md:flex items-center gap-0 overflow-x-auto flex-1 justify-center">
          {NAV_ITEMS.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="px-2 py-1 rounded-lg text-[10px] font-medium text-navi-muted hover:text-navi-text hover:bg-navi-surface2 transition-all whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="shrink-0 h-7 px-3 rounded-lg text-[11px] font-semibold text-navi-muted border border-navi-border hover:text-navi-text hover:border-navi-border2 transition-all"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
