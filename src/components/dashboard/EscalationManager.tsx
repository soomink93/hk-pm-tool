'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { isUrgent } from '@/lib/helpers'

export type Escalation = {
  id: string
  item: string
  tier: string
  dept: string
  needed: string
  deadline: string
  status: string
}

const emptyForm = (dept: string) => ({ item: '', tier: '3단계', dept, needed: '', deadline: '', status: '대기중' })

function statusTone(s: string): 'green' | 'yellow' | 'red' {
  return s === '완료' ? 'green' : s === '검토중' ? 'yellow' : 'red'
}

export function EscalationManager({
  escalations,
  teams,
  canEdit,
}: {
  escalations: Escalation[]
  teams: string[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm(teams[0] ?? ''))
  const [busy, setBusy] = useState(false)

  const openCount = escalations.filter((e) => e.status !== '완료').length
  const urgentCount = escalations.filter((e) => e.status !== '완료' && isUrgent(e.deadline)).length
  const doneCount = escalations.filter((e) => e.status === '완료').length

  function openAdd() {
    setEditId(null)
    setForm(emptyForm(teams[0] ?? ''))
    setOpen(true)
  }
  function openEdit(e: Escalation) {
    setEditId(e.id)
    setForm({ item: e.item, tier: e.tier, dept: e.dept, needed: e.needed, deadline: e.deadline, status: e.status })
    setOpen(true)
  }
  async function save() {
    setBusy(true)
    const res = await fetch(editId ? `/api/escalations/${editId}` : '/api/escalations', {
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
    const res = await fetch(`/api/escalations/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">에스컬레이션 트래커</h1>
        {canEdit && (
          <Button onClick={openAdd}>
            <Plus size={14} /> 항목 추가
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <StatCard title="오픈 항목" value={openCount} sub="결정 대기" valueClass="text-[#C00000]" />
        <StatCard title="긴급 (7일 이내)" value={urgentCount} sub="기한 임박" valueClass="text-[#E36C09]" />
        <StatCard title="완료" value={doneCount} sub="처리 완료" valueClass="text-[#70AD47]" />
      </div>

      <Card>
        {escalations.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-400">등록된 항목이 없습니다.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5">항목</th>
                <th className="py-2.5">단계</th>
                <th className="py-2.5">요청 부서</th>
                <th className="py-2.5">필요 결정</th>
                <th className="py-2.5">기한</th>
                <th className="py-2.5">상태</th>
                {canEdit && <th className="py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {escalations.map((e) => {
                const urgent = isUrgent(e.deadline) && e.status !== '완료'
                return (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-semibold">{e.item}</td>
                    <td className="py-2.5"><Badge tone="blue">{e.tier}</Badge></td>
                    <td className="py-2.5">{e.dept}</td>
                    <td className="py-2.5 text-xs text-slate-500">{e.needed}</td>
                    <td className="py-2.5" style={{ color: urgent ? '#C00000' : undefined, fontWeight: urgent ? 700 : 400 }}>
                      {e.deadline}
                    </td>
                    <td className="py-2.5"><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
                    {canEdit && (
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => remove(e.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '에스컬레이션 수정' : '에스컬레이션 추가'}>
        <Field label="항목명">
          <input className={inputClass} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
        </Field>
        <Field label="단계">
          <select className={inputClass} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option>2단계</option><option>3단계</option>
          </select>
        </Field>
        <Field label="요청 부서">
          <select className={inputClass} value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
            {teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="필요한 결정">
          <textarea className={`${inputClass} min-h-20`} value={form.needed} onChange={(e) => setForm({ ...form, needed: e.target.value })} />
        </Field>
        <Field label="결정 기한">
          <input type="date" className={inputClass} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </Field>
        <Field label="상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>대기중</option><option>검토중</option><option>완료</option>
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
