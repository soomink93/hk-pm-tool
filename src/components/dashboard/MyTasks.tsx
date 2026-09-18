'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, Handshake, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TASK_STATUS_LABEL, TASK_COLUMNS, PRIO_LABEL } from '@/lib/constants'

export type MyTask = {
  id: string
  title: string
  description: string
  team: string
  status: string
  priority: string
  dueDate: string
  collabFrom?: string | null
}

const PRIO_TONE: Record<string, 'red' | 'yellow' | 'green'> = { high: 'red', mid: 'yellow', low: 'green' }
const todayISO = () => new Date().toISOString().slice(0, 10)
const isOverdue = (t: MyTask) => !!t.dueDate && t.dueDate < todayISO() && t.status !== 'done'
const STATUS_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
}

export function MyTasks({ tasks }: { tasks: MyTask[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  const today = todayISO()
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const open = tasks.filter((t) => t.status !== 'done')
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today)
  const dueSoon = open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= soon)

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusyId(null)
    if (res.ok) router.refresh()
    else alert('변경에 실패했습니다.')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold text-navy">내 작업</h1>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard title="미완료" value={open.length} sub="할 일 + 진행 중" />
        <StatCard title="지연" value={overdue.length} sub="마감 초과" valueClass="text-[#C00000]" />
        <StatCard title="이번 주 마감" value={dueSoon.length} sub="7일 이내" valueClass="text-[#E36C09]" />
        <StatCard title="전체 배정" value={tasks.length} sub="완료 포함" valueClass="text-navy-light" />
      </div>

      {tasks.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[13px] text-slate-400">나에게 배정된 작업이 없습니다.</p>
        </Card>
      ) : (
        TASK_COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col)
          if (list.length === 0) return null
          const Icon = STATUS_ICON[col]
          return (
            <Card key={col}>
              <div className="mb-3 flex items-center gap-2">
                {Icon && <Icon size={15} className={col === 'done' ? 'text-[#70AD47]' : 'text-slate-400'} />}
                <h2 className="text-[13px] font-bold text-navy">{TASK_STATUS_LABEL[col]}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.map((t) => {
                  const od = isOverdue(t)
                  return (
                    <div key={t.id} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[13px] font-semibold ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-navy'}`}>{t.title}</span>
                          <Badge tone={PRIO_TONE[t.priority] ?? 'gray'}>{PRIO_LABEL[t.priority as keyof typeof PRIO_LABEL] ?? t.priority}</Badge>
                          {t.collabFrom && (
                            <Link href="/collaboration" className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-light hover:bg-blue-100">
                              <Handshake size={10} /> {t.collabFrom} 협업
                            </Link>
                          )}
                        </div>
                        {t.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{t.team}</span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1" style={{ color: od ? '#C00000' : undefined, fontWeight: od ? 700 : 400 }}>
                              <CalendarClock size={11} /> {t.dueDate}{od && ' (지연)'}
                            </span>
                          )}
                        </div>
                      </div>
                      <select
                        className="shrink-0 rounded border border-line px-1.5 py-1 text-[11px] outline-none disabled:opacity-50"
                        value={t.status}
                        disabled={busyId === t.id}
                        onChange={(e) => setStatus(t.id, e.target.value)}
                      >
                        {TASK_COLUMNS.map((s) => (
                          <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
