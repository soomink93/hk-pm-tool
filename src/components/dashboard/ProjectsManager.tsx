'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, X, FolderKanban } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { canEditProject, type Role } from '@/lib/rbac'

export type ProjectRow = {
  id: string; name: string; description: string; status: string; ownerId: string | null; ownerName: string
  dueDate: string; taskTotal: number; taskDone: number; teams: string[]
}
export type UserOpt = { id: string; name: string }

const STATUS_META: Record<string, { label: string; tone: 'green' | 'yellow' | 'gray' }> = {
  active: { label: '진행', tone: 'green' },
  onhold: { label: '보류', tone: 'yellow' },
  done: { label: '완료', tone: 'gray' },
}
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0)
const emptyForm = () => ({ name: '', description: '', ownerId: '', dueDate: '', status: 'active' })

export function ProjectsManager({
  projects, users, role, userId, allTeams,
}: {
  projects: ProjectRow[]; users: UserOpt[]
  role: Role; userId: string
  allTeams: string[]
}) {
  const router = useRouter()
  const canEditProjectRow = (ownerId: string | null) => canEditProject(role, ownerId, userId)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')

  const STATUS_FILTERS = [
    { id: 'all', label: '전체' }, { id: 'active', label: '진행' },
    { id: 'onhold', label: '보류' }, { id: 'done', label: '완료' },
  ]

  let shown = projects.filter((p) =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (teamFilter === 'all' || p.teams.includes(teamFilter)) &&
    (q.trim() === '' || p.name.toLowerCase().includes(q.trim().toLowerCase())),
  )
  shown = [...shown].sort((a, b) => {
    if (sort === 'progress') return pct(b.taskDone, b.taskTotal) - pct(a.taskDone, a.taskTotal)
    if (sort === 'due') {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate < b.dueDate ? -1 : 1
    }
    return 0 // recent: 서버가 createdAt desc로 이미 정렬
  })

  function openAdd() { setEditId(null); setForm(emptyForm()); setOpen(true) }
  function openEdit(p: ProjectRow) {
    setEditId(p.id)
    setForm({ name: p.name, description: p.description, ownerId: p.ownerId ?? '', dueDate: p.dueDate, status: p.status })
    setOpen(true)
  }
  async function save() {
    if (!form.name.trim()) return
    setBusy(true)
    const res = await fetch(editId ? `/api/projects/${editId}` : '/api/projects', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) { setOpen(false); router.refresh() }
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? '저장에 실패했습니다.') }
  }
  async function remove(id: string) {
    if (!confirm('프로젝트를 삭제하시겠습니까? (연결된 작업·협업·결정은 보존되고 연결만 해제됩니다)')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? '삭제에 실패했습니다.') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">프로젝트</h1>
        <Button onClick={openAdd}><Plus size={14} /> 새 프로젝트</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${f.id === statusFilter ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select className={`${inputClass} w-auto py-1.5`} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="all">전체 팀</option>
          {allTeams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className={`${inputClass} w-auto py-1.5`} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">최신순</option>
          <option value="due">마감임박</option>
          <option value="progress">진행률</option>
        </select>
        <input className={`${inputClass} w-auto py-1.5`} placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="ml-auto text-[11px] text-slate-400">{shown.length}개</span>
      </div>

      {shown.length === 0 ? (
        <Card><p className="py-10 text-center text-[13px] text-slate-400">조건에 맞는 프로젝트가 없습니다.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.active
            const progress = pct(p.taskDone, p.taskTotal)
            return (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-1.5 text-[14px] font-bold text-navy hover:underline">
                    <FolderKanban size={15} className="shrink-0 text-navy-light" />{p.name}
                  </Link>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">담당 {p.ownerName || '미지정'}{p.dueDate ? ` · 마감 ${p.dueDate}` : ''}</div>
                {p.teams.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.teams.slice(0, 4).map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{t}</span>)}
                  </div>
                )}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-navy-light" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>작업 {p.taskDone}/{p.taskTotal}</span><span>{progress}%</span>
                </div>
                {canEditProjectRow(p.ownerId) && (
                  <div className="mt-2.5 flex justify-end gap-1 border-t border-slate-50 pt-2">
                    <button onClick={() => openEdit(p)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제"><X size={15} /></button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '프로젝트 수정' : '새 프로젝트'}>
        <Field label="이름"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="설명"><textarea className={`${inputClass} min-h-16`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="담당자">
            <select className={inputClass} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">미지정</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="마감일"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        </div>
        <Field label="상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">진행</option><option value="onhold">보류</option><option value="done">완료</option>
          </select>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
