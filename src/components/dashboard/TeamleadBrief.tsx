'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Modal'
import { STATUS_LABEL, COLLAB_STATUS } from '@/lib/constants'

export type Collaboration = { team: string; content: string; status: string }

export type BriefRow = {
  id: string
  completed: string
  nextGoal: string
  status: string
  submittedAt: string
}

export function TeamleadBrief({
  team,
  status,
  last,
  lastCollaborations,
  teams,
  briefs,
}: {
  team: string
  status: string
  last: { completed: string; nextGoal: string; risk: string; escalation: string } | null
  lastCollaborations: Collaboration[]
  teams: string[]
  briefs: BriefRow[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    completed: last?.completed ?? '',
    nextGoal: last?.nextGoal ?? '',
    risk: last?.risk ?? '',
    escalation: last?.escalation ?? '',
    status,
  })
  const [collabs, setCollabs] = useState<Collaboration[]>(lastCollaborations ?? [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const otherTeams = teams.filter((t) => t !== team)

  function addCollab() {
    setCollabs([...collabs, { team: otherTeams[0] ?? '', content: '', status: '요청예정' }])
  }
  function updateCollab(i: number, field: keyof Collaboration, val: string) {
    setCollabs(collabs.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)))
  }
  function removeCollab(i: number) {
    setCollabs(collabs.filter((_, idx) => idx !== i))
  }

  async function submit() {
    setBusy(true)
    setMsg('')
    const res = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, collaborations: collabs.filter((c) => c.content.trim()) }),
    })
    setBusy(false)
    if (res.ok) {
      setMsg('보고가 제출되었습니다.')
      router.refresh()
    } else {
      setMsg('제출에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-4 text-base font-bold text-navy">{team} 주간 보고 입력</h1>
        <Field label="이번 주 완료 사항">
          <textarea className={`${inputClass} min-h-20`} value={form.completed} onChange={(e) => setForm({ ...form, completed: e.target.value })} placeholder="완료된 업무를 작성하세요" />
        </Field>
        <Field label="다음 주 주요 목표">
          <textarea className={`${inputClass} min-h-20`} value={form.nextGoal} onChange={(e) => setForm({ ...form, nextGoal: e.target.value })} placeholder="다음 주 목표 3가지 이내" />
        </Field>
        <Field label="지연 / 리스크">
          <input className={inputClass} value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} placeholder="없으면 '없음'" />
        </Field>
        <Field label="에스컬레이션 사항">
          <input className={inputClass} value={form.escalation} onChange={(e) => setForm({ ...form, escalation: e.target.value })} placeholder="없으면 '없음'" />
        </Field>
        <Field label="전체 상태">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="green">정상 진행</option>
            <option value="yellow">지연 위험</option>
            <option value="red">지연 중</option>
          </select>
        </Field>

        {/* 타 부문 협업 필요 사항 */}
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">타 부문 협업 필요 사항</label>
            <button onClick={addCollab} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-light hover:text-navy">
              <Plus size={13} /> 행 추가
            </button>
          </div>
          {collabs.length === 0 ? (
            <p className="rounded-md border border-dashed border-line py-3 text-center text-xs text-slate-400">
              협업이 필요한 부문이 있으면 행을 추가하세요. 없으면 비워둡니다.
            </p>
          ) : (
            <div className="space-y-2">
              {collabs.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select className={`${inputClass} w-32 shrink-0`} value={c.team} onChange={(e) => updateCollab(i, 'team', e.target.value)}>
                    {otherTeams.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input className={inputClass} value={c.content} onChange={(e) => updateCollab(i, 'content', e.target.value)} placeholder="협업 내용" />
                  <select className={`${inputClass} w-28 shrink-0`} value={c.status} onChange={(e) => updateCollab(i, 'status', e.target.value)}>
                    {COLLAB_STATUS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => removeCollab(i)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={busy}>
            <Send size={14} /> {busy ? '제출 중…' : '보고 제출'}
          </Button>
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-bold text-navy">이전 제출 기록</h2>
        {briefs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate-400">아직 제출 기록이 없습니다.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5">제출일</th>
                <th className="py-2.5">완료 사항</th>
                <th className="py-2.5">다음 목표</th>
                <th className="py-2.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-xs text-slate-400">{b.submittedAt}</td>
                  <td className="py-2.5">{b.completed}</td>
                  <td className="py-2.5">{b.nextGoal}</td>
                  <td className="py-2.5">
                    <StatusBadge status={b.status as keyof typeof STATUS_LABEL} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
