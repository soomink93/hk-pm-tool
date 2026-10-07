import type { ComponentType } from 'react'

// ── 지표 타일: 아이콘 + 큰 숫자 + 증감 ──
export function StatTile({
  icon: Icon,
  title,
  value,
  sub,
  accent,
  delta,
}: {
  icon: ComponentType<{ size?: number }>
  title: string
  value: number
  sub?: string
  accent: string
  delta?: number
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${accent}1A`, color: accent }}>
          <Icon size={18} />
        </div>
        {delta !== undefined && (
          <span className={`text-xs font-bold ${delta > 0 ? 'text-[#2E8540]' : delta < 0 ? 'text-[#C00000]' : 'text-slate-400'}`}>
            {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-extrabold leading-none text-navy">{value}</div>
      <div className="mt-1.5 text-[12px] font-semibold text-slate-600">{title}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

// ── 진행률 링(도넛) ──
export function ProgressRing({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  const r = 54
  const circ = 2 * Math.PI * r
  const off = circ * (1 - pct / 100)
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="14" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" className="fill-navy" style={{ fontSize: 30, fontWeight: 800 }}>{pct}%</text>
        <text x="70" y="88" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12 }}>{label}</text>
      </svg>
    </div>
  )
}

// ── 가로 세그먼트 바 + 범례 ──
export function SegmentBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="py-6 text-center text-[13px] text-slate-400">표시할 데이터가 없습니다.</p>
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label} ${s.value}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-slate-500">{s.label}</span>
            <span className="ml-auto font-bold text-navy">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 7일 추세: 지난주 vs 이번주 미니 막대 ──
export function TrendBars({ items }: { items: { label: string; now: number; prev: number; color: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((t) => {
        const max = Math.max(t.now, t.prev, 1)
        const delta = t.now - t.prev
        return (
          <div key={t.label} className="rounded-lg bg-canvas px-3 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-slate-500">{t.label}</span>
              <span className={`text-[11px] font-bold ${delta > 0 ? 'text-[#2E8540]' : delta < 0 ? 'text-[#C00000]' : 'text-slate-400'}`}>
                {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2" style={{ height: 48 }}>
              <div className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-slate-300" style={{ height: `${(t.prev / max) * 40 + 2}px` }} />
                <span className="text-[9px] text-slate-400">지난주 {t.prev}</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t" style={{ height: `${(t.now / max) * 40 + 2}px`, background: t.color }} />
                <span className="text-[9px] font-semibold text-navy">이번주 {t.now}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 팀 상태 보드 ──
const TEAM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  green: { label: '정상', color: '#2E8540', bg: '#EAF6EC' },
  yellow: { label: '주의', color: '#B7791F', bg: '#FEF6E7' },
  red: { label: '지연', color: '#C00000', bg: '#FDECEC' },
  gray: { label: '미정', color: '#64748b', bg: '#F1F5F9' },
}

export function TeamStatusGrid({ teams }: { teams: { name: string; lead: string; status: string }[] }) {
  if (teams.length === 0) return <p className="py-6 text-center text-[13px] text-slate-400">등록된 팀이 없습니다.</p>
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {teams.map((t) => {
        const s = TEAM_STATUS[t.status] ?? TEAM_STATUS.gray
        return (
          <div key={t.name} className="rounded-lg border border-line px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="truncate text-[13px] font-bold text-navy">{t.name}</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="truncate text-[11px] text-slate-400">{t.lead}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: s.color, background: s.bg }}>{s.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
