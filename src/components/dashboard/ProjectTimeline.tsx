// 프로젝트 작업을 마감일 기준으로 가로 타임라인에 배치. 오늘선·상태색·지연 강조.
const COLOR: Record<string, string> = { todo: '#94A3B8', in_progress: '#E0A106', done: '#2E8540' }
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{t}</span>
}

export function ProjectTimeline({ tasks, projectDue }: { tasks: { title: string; dueDate: string; status: string }[]; projectDue?: string }) {
  const today = new Date().toISOString().slice(0, 10)
  const dated = tasks.filter((t) => t.dueDate).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
  if (dated.length === 0)
    return <p className="py-6 text-center text-[13px] text-slate-400">마감일이 지정된 작업이 없습니다.</p>

  const marks = [...dated.map((t) => t.dueDate), today, ...(projectDue ? [projectDue] : [])]
  const min = marks.reduce((a, b) => (a < b ? a : b))
  const max = marks.reduce((a, b) => (a > b ? a : b))
  const span = Math.max(1, days(min, max))
  const pos = (d: string) => Math.min(100, Math.max(0, (days(min, d) / span) * 100))
  const todayPos = pos(today)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{min}</span>
        <span className="flex items-center gap-3"><Legend c="#94A3B8" t="할 일" /><Legend c="#E0A106" t="진행 중" /><Legend c="#2E8540" t="완료" /></span>
        <span>{max}</span>
      </div>
      <div className="space-y-1.5">
        {dated.map((t, i) => {
          const overdue = t.dueDate < today && t.status !== 'done'
          const c = overdue ? '#C00000' : COLOR[t.status] ?? '#94A3B8'
          const p = pos(t.dueDate)
          const labelLeft = p > 60
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[12px] text-slate-600" title={t.title}>{t.title}</span>
              <div className="relative h-6 flex-1 rounded bg-slate-50">
                <div className="absolute inset-y-0 w-px bg-navy-light/40" style={{ left: `${todayPos}%` }} title={`오늘 ${today}`} />
                <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: `${p}%`, background: c }} />
                <span
                  className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold"
                  style={labelLeft ? { right: `calc(${100 - p}% + 8px)`, color: c } : { left: `calc(${p}% + 8px)`, color: c }}
                >
                  {t.dueDate.slice(5)}{overdue ? ' 지연' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-[10px] text-slate-400">│ 세로선 = 오늘({today.slice(5)})</div>
    </div>
  )
}
