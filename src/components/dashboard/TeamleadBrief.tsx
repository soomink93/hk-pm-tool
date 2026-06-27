'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Modal'
import { STATUS_LABEL } from '@/lib/constants'

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
  briefs,
}: {
  team: string
  status: string
  last: { completed: string; nextGoal: string; risk: string; escalation: string } | null
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
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    setBusy(true)
    setMsg('')
    const res = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
