import Link from 'next/link'

// 포트폴리오 간트: 전 프로젝트를 공유 날짜축에 그룹별로. 작업=시작~마감 막대, 상태색, 오늘선, 월 눈금.
const COLOR: Record<string, string> = { todo: '#94A3B8', in_progress: '#E0A106', done: '#2E8540' }
const STATUS: Record<string, { label: string; tone: 'green' | 'yellow' | 'gray' }> = {
  active: { label: '진행', tone: 'green' }, onhold: { label: '보류', tone: 'yellow' }, done: { label: '완료', tone: 'gray' },
}
const ts = (s: string) => Date.parse(s)
const DAY = 86_400_000
const NAME_W = '11rem'

type T = { projectId: string | null; title: string; status: string; start: string; dueDate: string }
type P = { id: string; name: string; status: string; dueDate: string }

export function RoadmapView({ projects, tasks }: { projects: P[]; tasks: T[] }) {
  if (projects.length === 0)
    return <p className="py-10 text-center text-[13px] text-slate-400">프로젝트가 없습니다. 프로젝트 탭에서 먼저 생성하세요.</p>

  const todayTs = Date.parse(new Date().toISOString().slice(0, 10))
  const dated = tasks.filter((t) => t.dueDate && t.projectId)
  const marks = [todayTs, ...projects.filter((p) => p.dueDate).map((p) => ts(p.dueDate))]
  for (const t of dated) { marks.push(ts(t.dueDate), t.start ? ts(t.start) : ts(t.dueDate)) }
  const min = Math.min(...marks) - 3 * DAY
  const max = Math.max(...marks) + 3 * DAY
  const span = Math.max(DAY, max - min)
  const pos = (t: number) => ((t - min) / span) * 100
  const todayP = pos(todayTs)

  const ticks: { p: number; label: string }[] = []
  const d = new Date(min); d.setDate(1); d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) {
    if (d.getTime() >= min) ticks.push({ p: pos(d.getTime()), label: `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}` })
    d.setMonth(d.getMonth() + 1)
  }

  const grid = (
    <>
      {ticks.map((tk, i) => <span key={i} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${tk.p}%` }} />)}
      <span className="absolute inset-y-0 z-10 w-0.5 bg-navy-light" style={{ left: `${todayP}%` }} title="오늘" />
    </>
  )

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px] space-y-0">
        <div className="flex items-end border-b-2 border-line pb-1">
          <div style={{ width: NAME_W }} className="shrink-0" />
          <div className="relative h-4 flex-1">
            {ticks.map((tk, i) => <span key={i} className="absolute -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${tk.p}%` }}>{tk.label}</span>)}
          </div>
        </div>

        {projects.map((p) => {
          const pts = dated.filter((t) => t.projectId === p.id).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
          const starts = pts.map((t) => (t.start ? ts(t.start) : ts(t.dueDate)))
          const ends = [...pts.map((t) => ts(t.dueDate)), ...(p.dueDate ? [ts(p.dueDate)] : [])]
          const meta = STATUS[p.status] ?? STATUS.active
          return (
            <div key={p.id} className="border-b border-slate-100 py-1.5">
              <div className="flex items-center">
                <div style={{ width: NAME_W }} className="flex shrink-0 items-center gap-1.5 pr-2">
                  <Link href={`/projects/${p.id}`} className="truncate text-[13px] font-bold text-navy hover:underline" title={p.name}>{p.name}</Link>
                  <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${meta.tone === 'green' ? 'bg-green-50 text-[#2E8540]' : meta.tone === 'yellow' ? 'bg-amber-50 text-[#B7791F]' : 'bg-slate-100 text-slate-500'}`}>{meta.label}</span>
                </div>
                <div className="relative h-5 flex-1 rounded bg-slate-50">
                  {grid}
                  {starts.length > 0 && (
                    <span className="absolute top-1/2 z-20 h-2 -translate-y-1/2 rounded-full bg-navy-light/40" style={{ left: `${pos(Math.min(...starts))}%`, width: `${Math.max(1, pos(Math.max(...ends)) - pos(Math.min(...starts)))}%` }} />
                  )}
                </div>
              </div>

              {pts.map((t, i) => {
                const s = t.start ? ts(t.start) : ts(t.dueDate)
                const e = ts(t.dueDate)
                const overdue = e < todayTs && t.status !== 'done'
                const c = overdue ? '#C00000' : COLOR[t.status] ?? '#94A3B8'
                const left = pos(Math.min(s, e))
                const width = Math.max(1.5, pos(Math.max(s, e)) - left)
                return (
                  <div key={i} className="flex items-center">
                    <div style={{ width: NAME_W }} className="shrink-0 truncate pl-3 pr-2 text-[12px] text-slate-500" title={t.title}>{t.title}</div>
                    <div className="relative h-5 flex-1">
                      {grid}
                      <span className="absolute top-1/2 z-20 h-3 -translate-y-1/2 rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: c }} title={`${t.start || '?'} → ${t.dueDate}`} />
                    </div>
                  </div>
                )
              })}
              {pts.length === 0 && (
                <div className="flex"><div style={{ width: NAME_W }} className="shrink-0" /><div className="flex-1 pl-0 text-[10px] text-slate-400">마감 지정된 작업 없음</div></div>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#94A3B8' }} />할 일</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#E0A106' }} />진행 중</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#2E8540' }} />완료</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-navy-light/40" />프로젝트 기간</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-navy-light" />오늘</span>
        </div>
      </div>
    </div>
  )
}
