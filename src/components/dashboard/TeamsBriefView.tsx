'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { STATUS_LABEL, COLLAB_TONE } from '@/lib/constants'
import { STATUS_COLOR } from '@/lib/helpers'

export type Team = {
  id: string
  name: string
  lead: string
  status: string
  submitted: boolean
  risk: string
  escalation: string
}

export type CollabRequest = { from: string; to: string; content: string; status: string }

export function TeamsBriefView({
  teams,
  collabRequests,
  canEdit,
  readOnly,
}: {
  teams: Team[]
  collabRequests: CollabRequest[]
  canEdit: boolean
  readOnly: boolean
}) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ lead: '', status: 'green', risk: '', escalation: '' })
  const [busy, setBusy] = useState(false)

  function openEdit(t: Team) {
    setEditId(t.id)
    setForm({ lead: t.lead, status: t.status, risk: t.risk, escalation: t.escalation })
  }
  async function save() {
    if (!editId) return
    setBusy(true)
    const res = await fetch(`/api/teams/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) {
      setEditId(null)
      router.refresh()
    } else alert('저장에 실패했습니다.')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold text-navy">주간 보고 현황</h1>

      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          <BookOpen size={15} /> 읽기 전용 — 회장님 보기
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {teams.map((t) => (
          <Card key={t.id} className="!p-3.5" >
            <div className="border-l-4 pl-3" style={{ borderColor: STATUS_COLOR[t.status] ?? '#BFBFBF' }}>
              <div className="text-sm font-bold">{t.name}</div>
              <div className="mb-2 text-xs text-slate-400">팀장: {t.lead}</div>
              <StatusBadge status={t.status as keyof typeof STATUS_LABEL} />
              <div className="mt-1.5 text-[11px] text-slate-400">{t.submitted ? '제출 완료' : '미제출'}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="py-2.5">팀명</th>
              <th className="py-2.5">팀장</th>
              <th className="py-2.5">제출</th>
              <th className="py-2.5">상태</th>
              <th className="py-2.5">리스크</th>
              <th className="py-2.5">에스컬레이션</th>
              {canEdit && <th className="py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-semibold">{t.name}</td>
                <td className="py-2.5">{t.lead}</td>
                <td className="py-2.5">{t.submitted ? '✓' : '—'}</td>
                <td className="py-2.5"><StatusBadge status={t.status as keyof typeof STATUS_LABEL} /></td>
                <td className="py-2.5 text-xs" style={{ color: t.risk && t.risk !== '없음' ? '#E36C09' : '#94a3b8' }}>{t.risk || '—'}</td>
                <td className="py-2.5 text-xs" style={{ color: t.escalation && t.escalation !== '없음' ? '#C00000' : '#94a3b8' }}>{t.escalation || '—'}</td>
                {canEdit && (
                  <td className="py-2.5">
                    <button onClick={() => openEdit(t)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                      <Pencil size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-bold text-navy">타 부문 협업 필요 사항</h2>
        {collabRequests.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate-400">현재 협업 요청 사항이 없습니다.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5">요청 팀</th>
                <th className="py-2.5">협업 필요 팀</th>
                <th className="py-2.5">협업 내용</th>
                <th className="py-2.5">조율 상태</th>
              </tr>
            </thead>
            <tbody>
              {collabRequests.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-semibold">{c.from}</td>
                  <td className="py-2.5">{c.to}</td>
                  <td className="py-2.5">{c.content}</td>
                  <td className="py-2.5">
                    <Badge tone={COLLAB_TONE[c.status] ?? 'gray'}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="팀 상태 수정">
        <Field label="팀장 이름">
          <input className={inputClass} value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} />
        </Field>
        <Field label="상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="green">정상 진행</option>
            <option value="yellow">지연 위험</option>
            <option value="red">지연 중</option>
            <option value="gray">미제출</option>
          </select>
        </Field>
        <Field label="주요 리스크">
          <input className={inputClass} value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} />
        </Field>
        <Field label="에스컬레이션">
          <input className={inputClass} value={form.escalation} onChange={(e) => setForm({ ...form, escalation: e.target.value })} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditId(null)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
