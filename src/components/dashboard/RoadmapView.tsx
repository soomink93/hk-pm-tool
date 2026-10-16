'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

// 좌: 프로젝트 리스트(상태·진행률) / 우: 선택 프로젝트의 간트 상세
const COLOR: Record<string, string> = { todo: '#94A3B8', in_progress: '#E0A106', done: '#2E8540' }
const STATUS: Record<string, { label: string; tone: 'green' | 'yellow' | 'gray' }> = {
  active: { label: '진행', tone: 'green' }, onhold: { label: '보류', tone: 'yellow' }, done: { label: '완료', tone: 'gray' },
}
const toneCls = (t: string) =>
  t === 'green' ? 'bg-green-50 text-[#2E8540]' : t === 'yellow' ? 'bg-amber-50 text-[#B7791F]' : 'bg-slate-100 text-slate-500'
const ts = (s: string) => Date.parse(s)
const DAY = 86_400_000

type T = { projectId: string | null; title: string; status: string; start: string; dueDate: string }
type P = { id: string; name: string; status: string; dueDate: string }

function DetailGantt({ project, tasks }: { project: P; tasks: T[] }) {
  const todayTs = Date.parse(new Date().toISOString().slice(0, 10))
  const dated = tasks.filter((t) => t.dueDate).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
  const marks = [todayTs, ...(project.dueDate ? [ts(project.dueDate)] : [])]
  for (const t of dated) { marks.push(ts(t.dueDate), t.start ? ts(t.start) : ts(t.dueDate)) }
  if (marks.length < 2) marks.push(todayTs + 30 * DAY)
  const min = Math.min(...marks) - 3 * DAY
  const max = Math.max(...marks) + 3 * DAY
  const span = Math.max(DAY, max - min)
  const pos = (t: number) => ((t - min) / span) * 100
  const todayP = pos(todayTs)
  const dueP = project.dueDate ? pos(ts(project.dueDate)) : null

  const ticks: { p: number; label: string }[] = []
  const d = new Date(min); d.setDate(1); d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) {
    if (d.getTime() >= min) ticks.push({ p: pos(d.getTime()), label: `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}` })
    d.setMonth(d.getMonth() + 1)
  }
  const grid = (
    <>
      {ticks.map((tk, i) => <span key={i} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${tk.p}%` }} />)}
      {dueP !== null && dueP >= 0 && dueP <= 100 && <span className="absolute inset-y-0 z-10 w-0.5 bg-[#7C3AED] opacity-70" style={{ left: `${dueP}%` }} title={`프로젝트 마감 ${project.dueDate}`} />}
      <span className="absolute inset-y-0 z-10 w-0.5 bg-navy-light" style={{ left: `${todayP}%` }} title="오늘" />
    </>
  )

  if (dated.length === 0)
    return <p className="py-8 text-center text-[13px] text-slate-400">마감일이 지정된 작업이 없습니다.</p>

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="mb-1 flex items-end">
          <div className="w-40 shrink-0" />
          <div className="relative h-4 flex-1">
            {ticks.map((tk, i) => <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400" style={{ left: `${tk.p}%` }}>{tk.label}</span>)}
          </div>
        </div>
        <div className="space-y-1.5">
          {dated.map((t, i) => {
            const s = t.start ? ts(t.start) : ts(t.dueDate)
            const e = ts(t.dueDate)
            const overdue = e < todayTs && t.status !== 'done'
            const c = overdue ? '#C00000' : COLOR[t.status] ?? '#94A3B8'
            const left = pos(Math.min(s, e))
            const width = Math.max(1.5, pos(Math.max(s, e)) - left)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-[12px] text-slate-600" title={t.title}>{t.title}</span>
                <div className="relative h-5 flex-1 rounded bg-slate-50">
                  {grid}
                  <span className="absolute top-1/2 z-20 h-3.5 -translate-y-1/2 rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: c }} title={`${t.start || '?'} → ${t.dueDate}`} />
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] font-semibold" style={{ color: c }}>{overdue ? '지연' : t.dueDate.slice(5)}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#94A3B8' }} />할 일</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#E0A106' }} />진행 중</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#2E8540' }} />완료</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-navy-light" />오늘</span>
          {project.dueDate && <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-[#7C3AED]" />프로젝트 마감</span>}
        </div>
      </div>
    </div>
  )
}

export function RoadmapView({ projects, tasks }: { projects: P[]; tasks: T[] }) {
  const [sel, setSel] = useState<string | null>(projects[0]?.id ?? null)
  if (projects.length === 0)
    return <p className="py-10 text-center text-[13px] text-slate-400">프로젝트가 없습니다. 프로젝트 탭에서 먼저 생성하세요.</p>

  const prog = (pid: string) => {
    const pts = tasks.filter((t) => t.projectId === pid)
    const done = pts.filter((t) => t.status === 'done').length
    return { total: pts.length, done, pct: pts.length ? Math.round((done / pts.length) * 100) : 0 }
  }
  const selected = projects.find((p) => p.id === sel) ?? null
  const selTasks = selected ? tasks.filter((t) => t.projectId === selected.id) : []
  const selProg = selected ? prog(selected.id) : null

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      {/* 왼쪽: 프로젝트 리스트 */}
      <div className="max-h-[72vh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-line">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
          <span className="flex-1">프로젝트</span><span className="w-10 text-right">진행률</span>
        </div>
        {projects.map((p) => {
          const pr = prog(p.id)
          const meta = STATUS[p.status] ?? STATUS.active
          const on = p.id === sel
          return (
            <button
              key={p.id}
              onClick={() => setSel(p.id)}
              className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition ${on ? 'bg-navy-light/10' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`truncate text-[13px] font-semibold ${on ? 'text-navy' : 'text-slate-700'}`} title={p.name}>{p.name}</span>
                <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${toneCls(meta.tone)}`}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pr.pct}%`, background: pr.pct === 100 ? '#2E8540' : '#E0A106' }} />
                </div>
                <span className="w-9 shrink-0 text-right text-[11px] font-bold text-slate-500">{pr.pct}%</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 오른쪽: 선택 프로젝트 상세 */}
      <div className="min-w-0">
        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2.5">
              <h2 className="text-[15px] font-bold text-navy">{selected.name}</h2>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${toneCls((STATUS[selected.status] ?? STATUS.active).tone)}`}>{(STATUS[selected.status] ?? STATUS.active).label}</span>
              <Link href={`/projects/${selected.id}`} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-navy-light hover:underline">
                프로젝트 상세 <ExternalLink size={12} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-slate-500">
              <span>마감 <b className="text-slate-700">{selected.dueDate || '미정'}</b></span>
              <span>작업 <b className="text-slate-700">{selProg!.done}/{selProg!.total}</b></span>
              <span>진행률 <b className="text-slate-700">{selProg!.pct}%</b></span>
            </div>
            <DetailGantt project={selected} tasks={selTasks} />
          </div>
        ) : (
          <p className="py-10 text-center text-[13px] text-slate-400">왼쪽에서 프로젝트를 선택하세요.</p>
        )}
      </div>
    </div>
  )
}
