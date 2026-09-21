'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { PRIO_LABEL, PRIO_CLASS } from '@/lib/constants'
import { TIER_DECIDER_LABEL } from '@/lib/rbac'

export type Decision = {
  id: string
  date: string
  content: string
  category: string
  tier: string
  decider: string
  priority: string
  status: string
  createdById: string | null
  fromEscalation: boolean
}

export const DECISION_CATEGORIES = ['예산', '인사', '계약', '전략', '운영', '기타'] as const
const CATEGORY_TONE: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  예산: 'green', 인사: 'blue', 계약: 'yellow', 전략: 'red', 운영: 'gray', 기타: 'gray',
}

const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = () => ({ date: today(), content: '', category: '기타', tier: '2단계', decider: '', priority: 'mid', status: '완료' })

export function DecisionsManager({
  decisions,
  canAdd,
  isFull,
  currentUserId,
}: {
  decisions: Decision[]
  canAdd: boolean
  isFull: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const canEditRow = (d: Decision) => isFull || d.createdById === currentUserId
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  const shown = catFilter === 'all' ? decisions : decisions.filter((d) => d.category === catFilter)

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setOpen(true)
  }
  function openEdit(d: Decision) {
    setEditId(d.id)
    setForm({ date: d.date, content: d.content, category: d.category, tier: d.tier, decider: d.decider, priority: d.priority, status: d.status })
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
        {canAdd && (
          <Button onClick={openAdd}>
            <Plus size={14} /> 결정 추가
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setCatFilter('all')}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${catFilter === 'all' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          전체
        </button>
        {DECISION_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${catFilter === c ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <Card>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-400">
            {decisions.length === 0 ? '등록된 결정이 없습니다.' : '해당 분류의 결정이 없습니다.'}
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5">날짜</th>
                <th className="py-2.5">분류</th>
                <th className="py-2.5">결정 내용</th>
                <th className="py-2.5">단계</th>
                <th className="py-2.5">결정자</th>
                <th className="py-2.5">우선순위</th>
                <th className="py-2.5">상태</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-xs text-slate-400">{d.date}</td>
                  <td className="py-2.5"><Badge tone={CATEGORY_TONE[d.category] ?? 'gray'}>{d.category}</Badge></td>
                  <td className="py-2.5 font-semibold">
                    {d.content}
                    {d.fromEscalation && (
                      <Link href="/escalation" className="ml-1.5 inline-flex align-middle" title="결정 요청에서 올라온 결정 — 원 항목 보기">
                        <Badge tone="blue">↩ 결정 요청</Badge>
                      </Link>
                    )}
                  </td>
                  <td className="py-2.5"><Badge tone="blue">{d.tier}</Badge></td>
                  <td className="py-2.5">{d.decider}</td>
                  <td className={`py-2.5 ${PRIO_CLASS[d.priority as keyof typeof PRIO_CLASS] ?? ''}`}>
                    {PRIO_LABEL[d.priority as keyof typeof PRIO_LABEL] ?? d.priority}
                  </td>
                  <td className="py-2.5">
                    <Badge tone={d.status === '완료' ? 'green' : 'yellow'}>{d.status}</Badge>
                  </td>
                  <td className="py-2.5">
                    {canEditRow(d) && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(d)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(d.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </td>
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
        <Field label="분류">
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {DECISION_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="단계 (결정권자)">
          <select className={inputClass} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option>1단계</option><option>2단계</option><option>3단계</option>
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            {form.tier} → <b className="text-slate-500">{TIER_DECIDER_LABEL[form.tier] ?? '상위 결정권자'}</b>
          </p>
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
            <option>완료</option><option>보류</option>
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
