import Link from 'next/link'
import { STAGES, diffDays, fmt, stageDef, toTs, today } from '@/lib/orders/stages'

// 날짜축 공용 간트. 행마다 여러 막대(포트폴리오=단계들을 한 줄에, 상세=단계별 한 줄).
// base = 최초 계획(회색 점선 막대), due = 납기 마커(빨간 선)
export type Bar = { start: string; end: string; color: string; done?: boolean; late?: boolean; base?: { start: string; end: string }; title: string }
export type Row = { key: string; label: React.ReactNode; href?: string; sub?: React.ReactNode; bars: Bar[]; due?: string }

type StageLike = { seq: number; name: string; start: string; end: string; baseStart: string; baseEnd: string; status: string; assignee: string }

export const stageBar = (s: StageLike, now = today()): Bar => ({
  start: s.start,
  end: s.end,
  base: { start: s.baseStart, end: s.baseEnd },
  color: stageDef(s.name)?.color ?? '#94A3B8',
  done: s.status === 'done',
  late: s.status !== 'done' && s.end < now,
  title: `${s.name}${s.assignee ? ` · ${s.assignee}` : ''}`,
})

const DAY = 86_400_000
const NAME_W = '13rem'

export function Gantt({ rows, legend = true }: { rows: Row[]; legend?: boolean }) {
  if (!rows.length) return <p className="py-10 text-center text-[13px] text-slate-400">표시할 수주가 없습니다.</p>

  const now = today()
  const marks = [toTs(now)]
  for (const r of rows) {
    if (r.due) marks.push(toTs(r.due))
    for (const b of r.bars) marks.push(toTs(b.start), toTs(b.end), ...(b.base ? [toTs(b.base.start), toTs(b.base.end)] : []))
  }
  const min = Math.min(...marks) - 3 * DAY
  const max = Math.max(...marks) + 4 * DAY
  const span = max - min
  const pos = (d: string) => ((toTs(d) - min) / span) * 100
  const width = (a: string, b: string) => Math.max(0.6, pos(b) - pos(a))

  // 4개월 이하면 주 단위(월요일), 아니면 월 단위 눈금
  const weekly = span <= 120 * DAY
  const ticks: { p: number; label: string; strong: boolean }[] = []
  const d = new Date(min)
  if (weekly) d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7))
  else d.setUTCDate(1)
  for (; d.getTime() <= max; weekly ? d.setUTCDate(d.getUTCDate() + 7) : d.setUTCMonth(d.getUTCMonth() + 1)) {
    if (d.getTime() < min) continue
    const s = fmt(d.getTime())
    ticks.push({ p: pos(s), label: weekly ? `${d.getUTCMonth() + 1}/${d.getUTCDate()}` : `${String(d.getUTCFullYear()).slice(2)}.${d.getUTCMonth() + 1}`, strong: !weekly || d.getUTCDate() <= 7 })
  }

  const grid = (
    <>
      {ticks.map((t, i) => <span key={i} className={`absolute inset-y-0 w-px ${t.strong ? 'bg-slate-200' : 'bg-slate-100'}`} style={{ left: `${t.p}%` }} />)}
      <span className="absolute inset-y-0 z-10 w-0.5 bg-navy-light" style={{ left: `${pos(now)}%` }} title={`오늘 ${now}`} />
    </>
  )

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex items-end border-b-2 border-line pb-1">
          <div style={{ width: NAME_W }} className="shrink-0" />
          <div className="relative h-4 flex-1">
            {ticks.map((t, i) => <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400" style={{ left: `${t.p}%` }}>{t.label}</span>)}
          </div>
        </div>

        {rows.map((r) => (
          <div key={r.key} className="flex items-center border-b border-slate-100 py-1">
            <div style={{ width: NAME_W }} className="shrink-0 pr-2">
              {r.href ? (
                <Link href={r.href} className="block truncate text-[13px] font-bold text-navy hover:underline">{r.label}</Link>
              ) : (
                <div className="truncate text-[13px] font-semibold text-slate-700">{r.label}</div>
              )}
              {r.sub && <div className="truncate text-[11px] text-slate-400">{r.sub}</div>}
            </div>
            <div className="relative h-8 flex-1">
              {grid}
              {r.bars.map((b, i) => (
                <span key={i}>
                  {b.base && (b.base.start !== b.start || b.base.end !== b.end) && (
                    <span className="absolute bottom-0.5 h-1.5 rounded-sm border border-dashed border-slate-400 bg-slate-100" style={{ left: `${pos(b.base.start)}%`, width: `${width(b.base.start, b.base.end)}%` }} title={`최초 계획 ${b.base.start} → ${b.base.end}`} />
                  )}
                  <span
                    className={`absolute top-1 z-20 h-4 rounded ${b.late ? 'ring-2 ring-red-600' : ''}`}
                    style={{ left: `${pos(b.start)}%`, width: `${width(b.start, b.end)}%`, background: b.color, opacity: b.done ? 1 : 0.55 }}
                    title={`${b.title}\n${b.start} → ${b.end} (${diffDays(b.start, b.end)}일)${b.late ? '\n⚠ 마감 지남' : ''}`}
                  />
                </span>
              ))}
              {r.due && <span className="absolute inset-y-0 z-30 w-0.5 bg-red-600" style={{ left: `${pos(r.due)}%` }} title={`납기 ${r.due}`} />}
            </div>
          </div>
        ))}

        {legend && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[10px] text-slate-500">
            {STAGES.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: s.color }} />{s.name}</span>
            ))}
            <span className="text-slate-300">|</span>
            <span>진한색 = 완료 · 연한색 = 진행/대기</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded ring-2 ring-red-600" />마감 지남</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-4 rounded-sm border border-dashed border-slate-400" />최초 계획</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-red-600" />납기</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-navy-light" />오늘</span>
          </div>
        )}
      </div>
    </div>
  )
}
