'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, X, CalendarClock, User, Handshake } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { TASK_STATUS_LABEL, TASK_COLUMNS, PRIO_LABEL } from '@/lib/constants'

export type Task = {
  id: string
  title: string
  description: string
  team: string
  assignee: string
  status: string
  priority: string
  dueDate: string
  createdByName: string
  collabFrom?: string | null
}

const PRIO_TONE: Record<string, 'red' | 'yellow' | 'green'> = { high: 'red', mid: 'yellow', low: 'green' }
const todayISO = () => new Date().toISOString().slice(0, 10)
const isOverdue = (t: Task) => !!t.dueDate && t.dueDate < todayISO() && t.status !== 'done'

const emptyForm = (team: string) => ({
  title: '',
  description: '',
  team,
  assignee: '',
  status: 'todo',
  priority: 'mid',
  dueDate: '',
})

export function TaskBoard({
  tasks,
  myTeam,
  teams,
  role,
  editableTeams,
}: {
  tasks: Task[]
  myTeam: string
  teams: string[]
  role: string
  editableTeams: 'all' | string[]
}) {
  const router = useRouter()
  const canEditT = (t: string) => editableTeams === 'all' || editableTeams.includes(t)
  const myTeams = editableTeams === 'all' ? teams : teams.filter((t) => editableTeams.includes(t))
  const privileged = role !== 'teamlead' // 팀 필터 노출(여러 팀 조회 가능)
  const canCreate = myTeams.length > 0
  const editable = (t: Task) => canEditT(t.team)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm(myTeam || teams[0] || ''))
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')

  const shown = filter === 'all' ? tasks : tasks.filter((t) => t.team === filter)

  function openAdd() {
    setEditId(null)
    setForm(emptyForm(role === 'teamlead' ? myTeam : myTeams.includes(filter) ? filter : myTeams[0] || ''))
    setOpen(true)
  }
  function openEdit(t: Task) {
    setEditId(t.id)
    setForm({ title: t.title, description: t.description, team: t.team, assignee: t.assignee, status: t.status, priority: t.priority, dueDate: t.dueDate })
    setOpen(true)
  }
  async function save() {
    if (!form.title.trim()) return
    setBusy(true)
    const res = await fetch(editId ? `/api/tasks/${editId}` : '/api/tasks', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? '저장에 실패했습니다.')
    }
  }
  async function setStatus(t: Task, status: string) {
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) router.refresh()
    else alert('변경에 실패했습니다.')
  }
  async function remove(id: string) {
    if (!confirm('작업을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold text-navy">작업 보드</h1>
        <div className="flex items-center gap-2">
          {privileged && (
            <select className={`${inputClass} w-auto py-1.5`} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">전체 팀</option>
              {teams.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          )}
          {canCreate && (
            <Button onClick={openAdd}>
              <Plus size={14} /> 새 작업
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-3">
        {TASK_COLUMNS.map((col) => {
          const list = shown.filter((t) => t.status === col)
          return (
            <div key={col} className="rounded-xl bg-slate-100/60 p-3">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-[13px] font-bold text-navy">{TASK_STATUS_LABEL[col]}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">{list.length}</span>
              </div>
              <div className="space-y-2.5">
                {list.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">작업 없음</p>}
                {list.map((t) => {
                  const overdue = isOverdue(t)
                  return (
                    <Card key={t.id} className="!p-3">
                      <div className="mb-1 flex items-start gap-2">
                        <span className="flex-1 text-[13px] font-semibold text-navy">{t.title}</span>
                        <Badge tone={PRIO_TONE[t.priority] ?? 'gray'}>{PRIO_LABEL[t.priority as keyof typeof PRIO_LABEL] ?? t.priority}</Badge>
                      </div>
                      {t.collabFrom && (
                        <Link href="/collaboration" className="mb-1.5 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-light hover:bg-blue-100">
                          <Handshake size={10} /> {t.collabFrom} 협업
                        </Link>
                      )}
                      {t.description && <p className="mb-2 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        {t.assignee && (
                          <span className="flex items-center gap-1"><User size={11} /> {t.assignee}</span>
                        )}
                        {t.dueDate && (
                          <span className="flex items-center gap-1" style={{ color: overdue ? '#C00000' : undefined, fontWeight: overdue ? 700 : 400 }}>
                            <CalendarClock size={11} /> {t.dueDate}{overdue && ' (지연)'}
                          </span>
                        )}
                        {(privileged || filter === 'all') && <span className="text-slate-400">· {t.team}</span>}
                      </div>
                      {editable(t) && (
                        <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-50 pt-2">
                          <select
                            className="flex-1 rounded border border-line px-1.5 py-1 text-[11px] outline-none"
                            value={t.status}
                            onChange={(e) => setStatus(t, e.target.value)}
                          >
                            {TASK_COLUMNS.map((s) => (
                              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                          <button onClick={() => openEdit(t)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => remove(t.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '작업 수정' : '새 작업'}>
        <Field label="제목">
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 신제품 양산 검증 테스트" />
        </Field>
        <Field label="설명">
          <textarea className={`${inputClass} min-h-16`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        {role !== 'teamlead' && (
          <Field label="담당 팀">
            <select className={inputClass} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
              {myTeams.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="담당자">
            <input className={inputClass} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="이름" />
          </Field>
          <Field label="마감일">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="우선순위">
            <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="high">높음</option>
              <option value="mid">중간</option>
              <option value="low">낮음</option>
            </select>
          </Field>
          <Field label="상태">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {TASK_COLUMNS.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
