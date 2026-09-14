'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, LayoutDashboard, BarChart3, CheckSquare, TriangleAlert, FileText, Users, Loader2 } from 'lucide-react'

type Hit = { type: string; typeLabel: string; id: string; title: string; subtitle: string; href: string }

const ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  team: LayoutDashboard,
  kpi: BarChart3,
  decision: CheckSquare,
  escalation: TriangleAlert,
  brief: FileText,
  user: Users,
}

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 1) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
        const d = await res.json()
        setResults(d.results ?? [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(href: string) {
    setOpen(false)
    setQ('')
    setResults([])
    router.push(href)
  }

  // 유형별 그룹핑 (등장 순서 유지)
  const groups: { label: string; type: string; items: Hit[] }[] = []
  for (const r of results) {
    let g = groups.find((x) => x.type === r.type)
    if (!g) {
      g = { label: r.typeLabel, type: r.type, items: [] }
      groups.push(g)
    }
    g.items.push(r)
  }

  return (
    <div className="relative w-full max-w-md print:hidden" ref={ref}>
      <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-white focus-within:bg-white/25">
        <Search size={15} className="shrink-0 text-white/70" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="검색 (팀·KPI·결정·에스컬레이션·보고…)"
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/60"
        />
        {loading && <Loader2 size={14} className="shrink-0 animate-spin text-white/70" />}
        {!loading && q && (
          <button onClick={() => { setQ(''); setResults([]); setOpen(false) }} className="shrink-0 text-white/70 hover:text-white" aria-label="지우기">
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-slate-400">
              {loading ? '검색 중…' : `'${q.trim()}' 검색 결과가 없습니다.`}
            </p>
          ) : (
            groups.map((grp) => {
              const Icon = ICON[grp.type] ?? Search
              return (
                <div key={grp.type} className="border-b border-slate-50 last:border-0">
                  <div className="px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {grp.label} ({grp.items.length})
                  </div>
                  {grp.items.map((r) => (
                    <button key={r.id} onClick={() => go(r.href)} className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition hover:bg-slate-50">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-navy-light">
                        <Icon size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-navy">{r.title}</span>
                        <span className="block truncate text-xs text-slate-500">{r.subtitle}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
