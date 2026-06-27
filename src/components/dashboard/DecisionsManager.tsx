'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { PRIO_LABEL, PRIO_CLASS } from '@/lib/constants'

export type Decision = {
  id: string
  date: string
  content: string
  tier: string
  decider: string
  priority: string
  status: string
}

const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = () => ({ date: today(), content: '', tier: '2단계', decider: '', priority: 'mid', status: '진행중' })

export function DecisionsManager({ decisions, canEdit }: { decisions: Decision[]; canEdit: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setOpen(true)
  }
  function openEdit(d: Decision) {
    setEditId(d.id)
    setForm({ date: d.date, content: d.content, tier: d.tier, decider: d.decider, priority: d.priority, status: d.status })
    setOpen(true)
  }
  async function save() {
    setBusy(true)
    const res = await fetch(editId ? `/api/decisions/${editId}` : '/api/decisions', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else alert('저장에 실패했습니다.')
  }
  async function remove(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/decisions/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">결정 로그</h1>
        {canEdit && (
          <Button onClick={openAdd}>
            <Plus size={14} /> 결정 추가
          </Button>
        )}
      </div>

      <Card>
        {decisions.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-400">등록된 결정이 없습니다.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5">날짜</th>
                <th className="py-2.5">결정 내용</th>
                <th className="py-2.5">단계</th>
                <th className="py-2.5">결정자</th>
                <th className="py-2.5">우선순위</th>
                <th className="py-2.5">상태</th>
                {canEdit && <th className="py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-xs text-slate-400">{d.date}</td>
                  <td className="py-2.5 font-semibold">{d.content}</td>
                  <td className="py-2.5"><Badge tone="blue">{d.tier}</Badge></td>
                  <td className="py-2.5">{d.decider}</td>
                  <td className={`py-2.5 ${PRIO_CLASS[d.priority as keyof typeof PRIO_CLASS] ?? ''}`}>
                    {PRIO_LABEL[d.priority as keyof typeof PRIO_LABEL] ?? d.priority}
                  </td>
                  <td className="py-2.5">
                    <Badge tone={d.status === '완료' ? 'green' : 'yellow'}>{d.status}</Badge>
                  </td>
                  {canEdit && (
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(d)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(d.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '결정 수정' : '결정 추가'}>
        <Field label="날짜">
          <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="결정 내용">
          <textarea className={`${inputClass} min-h-20`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </Field>
        <Field label="단계">
          <select className={inputClass} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option>1단계</option><option>2단계</option><option>3단계</option>
          </select>
        </Field>
        <Field label="결정자">
          <input className={inputClass} value={form.decider} onChange={(e) => setForm({ ...form, decider: e.target.value })} />
        </Field>
        <Field label="우선순위">
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="high">높음</option><option value="mid">중간</option><option value="low">낮음</option>
          </select>
        </Field>
        <Field label="상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>완료</option><option>진행중</option><option>보류</option>
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
