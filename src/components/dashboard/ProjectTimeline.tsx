// 프로젝트 작업을 생성~마감 기간 막대로 배치. 월 눈금 + 오늘선 + 상태색 + 지연 강조.
const COLOR: Record<string, string> = { todo: '#94A3B8', in_progress: '#E0A106', done: '#2E8540' }
const DAY = 86_400_000
const ts = (s: string) => Date.parse(s)

export function ProjectTimeline({
  tasks,
  projectDue,
}: {
  tasks: { title: string; status: string; start: string; dueDate: string }[]
  projectDue?: string
}) {
  const todayTs = Date.parse(new Date().toISOString().slice(0, 10))
  const rows = tasks.filter((t) => t.dueDate).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
  const undated = tasks.length - rows.length
  if (rows.length === 0)
    return <p className="py-6 text-center text-[13px] text-slate-400">마감일이 지정된 작업이 없습니다.</p>

  const starts = rows.map((t) => (t.start ? ts(t.start) : ts(t.dueDate)))
  const ends = rows.map((t) => ts(t.dueDate))
  const min = Math.min(...starts, todayTs, ...(projectDue ? [ts(projectDue)] : [])) - 2 * DAY
  const max = Math.max(...ends, todayTs, ...(projectDue ? [ts(projectDue)] : [])) + 2 * DAY
  const span = Math.max(DAY, max - min)
  const pos = (t: number) => ((t - min) / span) * 100
  const todayP = pos(todayTs)

  // 월 눈금
  const ticks: { p: number; label: string }[] = []
  const d = new Date(min)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) {
    if (d.getTime() >= min) ticks.push({ p: pos(d.getTime()), label: `${d.getMonth() + 1}월` })
    d.setMonth(d.getMonth() + 1)
  }

  return (
    <div>
      <div className="relative mb-1 h-4">
        {ticks.map((t, i) => (
          <span key={i} className="absolute -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${t.p}%` }}>{t.label}</span>
        ))}
      </div>

      <div className="space-y-1.5">
        {rows.map((t, i) => {
          const s = t.start ? ts(t.start) : ts(t.dueDate)
          const e = ts(t.dueDate)
          const overdue = e < todayTs && t.status !== 'done'
          const color = overdue ? '#C00000' : COLOR[t.status] ?? '#94A3B8'
          const left = pos(Math.min(s, e))
          const width = Math.max(2, pos(Math.max(s, e)) - left)
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-[12px] text-slate-600" title={t.title}>{t.title}</span>
              <div className="relative h-5 flex-1 rounded bg-slate-50">
                {ticks.map((tk, j) => (
                  <span key={j} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${tk.p}%` }} />
                ))}
                <span className="absolute inset-y-0 z-10 w-0.5 bg-navy-light" style={{ left: `${todayP}%` }} title="오늘" />
                <span className="absolute top-1/2 z-20 h-3.5 -translate-y-1/2 rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: color }} title={`${t.start || '?'} → ${t.dueDate}`} />
              </div>
              <span className="w-12 shrink-0 text-right text-[10px] font-semibold" style={{ color }}>{overdue ? '지연' : t.dueDate.slice(5)}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#94A3B8' }} />할 일</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#E0A106' }} />진행 중</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#2E8540' }} />완료</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-navy-light" />오늘</span>
        {undated > 0 && <span className="ml-auto">마감 미정 {undated}건</span>}
      </div>
    </div>
  )
}
