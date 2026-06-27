'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { pct, pctTone } from '@/lib/helpers'

export type Kpi = {
  id: string
  team: string
  metric: string
  target: number
  current: number
  unit: string
}

const BAR_COLOR = { green: '#70AD47', yellow: '#FFC000', red: '#C00000' }
const empty = { team: '', metric: '', target: '', current: '', unit: '' }

export function KpiManager({
  kpis,
  teams,
  canEdit,
}: {
  kpis: Kpi[]
  teams: string[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(empty)
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setEditId(null)
    setForm({ ...empty, team: teams[0] ?? '' })
    setOpen(true)
  }
  function openEdit(k: Kpi) {
    setEditId(k.id)
    setForm({ team: k.team, metric: k.metric, target: String(k.target), current: String(k.current), unit: k.unit })
    setOpen(true)
  }

  async function save() {
    setBusy(true)
    const res = await fetch(editId ? `/api/kpis/${editId}` : '/api/kpis', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      alert('저장에 실패했습니다.')
    }
  }

  async function remove(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/kpis/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  const maxPct = Math.max(100, ...kpis.map((k) => pct(k.current, k.target)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">KPI 현황</h1>
        {canEdit && (
          <Button onClick={openAdd}>
            <Plus size={14} /> KPI 추가
          </Button>
        )}
      </div>

      {kpis.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-[13px] text-slate-400">등록된 KPI가 없습니다.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">목표 달성률</h2>
              <div className="space-y-3">
                {kpis.map((k) => {
                  const p = pct(k.current, k.target)
                  const tone = pctTone(p)
                  return (
                    <div key={k.id} className="flex items-center gap-3">
                      <div className="w-24 shrink-0 text-[13px] font-semibold text-slate-600">{k.team}</div>
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-canvas">
                        <div
                          className="flex h-full items-center rounded-md pl-2 text-[11px] font-bold text-white"
                          style={{ width: `${p}%`, background: BAR_COLOR[tone] }}
                        >
                          {p}%
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-right text-xs text-slate-400">
                        {k.current}/{k.target}
                        {k.unit}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">팀별 달성률</h2>
              <div className="flex h-48 items-end justify-around gap-2">
                {kpis.map((k) => {
                  const p = pct(k.current, k.target)
                  const tone = pctTone(p)
                  return (
                    <div key={k.id} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-500">{p}%</span>
                      <div
                        className="w-full max-w-10 rounded-t"
                        style={{ height: `${(p / maxPct) * 150}px`, background: BAR_COLOR[tone] }}
                      />
                      <span className="truncate text-[10px] text-slate-400">{k.team}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          <Card>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5">팀</th>
                  <th className="py-2.5">지표</th>
                  <th className="py-2.5">목표</th>
                  <th className="py-2.5">현재</th>
                  <th className="py-2.5">달성률</th>
                  <th className="py-2.5">상태</th>
                  {canEdit && <th className="py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => {
                  const p = pct(k.current, k.target)
                  return (
                    <tr key={k.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 font-semibold">{k.team}</td>
                      <td className="py-2.5">{k.metric}</td>
                      <td className="py-2.5">
                        {k.target}
                        {k.unit}
                      </td>
                      <td className="py-2.5">
                        {k.current}
                        {k.unit}
                      </td>
                      <td className="py-2.5">{p}%</td>
                      <td className="py-2.5">
                        <Badge tone={pctTone(p)}>{p}%</Badge>
                      </td>
                      {canEdit && (
                        <td className="py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(k)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => remove(k.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
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
          </Card>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'KPI 수정' : 'KPI 추가'}>
        <Field label="팀">
          <select className={inputClass} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
            {teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="지표명">
          <input className={inputClass} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="예) 월 매출 목표" />
        </Field>
        <Field label="목표값">
          <input type="number" className={inputClass} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        </Field>
        <Field label="현재값">
          <input type="number" className={inputClass} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <Field label="단위">
          <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, 건, 명" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
