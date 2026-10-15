'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

// 프로젝트 작업을 생성~마감 기간 막대로 배치. 월 눈금 + 오늘선 + 상태색 + 지연 강조.
// 편집 가능한 작업은 막대/이름을 클릭하면 마감일을 바로 수정.
const COLOR: Record<string, string> = { todo: '#94A3B8', in_progress: '#E0A106', done: '#2E8540' }
const DAY = 86_400_000
const ts = (s: string) => Date.parse(s)

type Row = { id: string; title: string; status: string; start: string; dueDate: string; editable: boolean }

export function ProjectTimeline({ tasks, projectDue }: { tasks: Row[]; projectDue?: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Row | null>(null)
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)

  const todayTs = Date.parse(new Date().toISOString().slice(0, 10))
  const rows = tasks.filter((t) => t.dueDate).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
  const undated = tasks.length - rows.length

  function openEdit(t: Row) {
    if (!t.editable) return
    setEditing(t)
    setDue(t.dueDate)
  }
  async function save() {
    if (!editing) return
    setBusy(true)
    const res = await fetch(`/api/tasks/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: due }),
    })
    setBusy(false)
    if (res.ok) {
      setEditing(null)
      router.refresh()
    } else alert('마감일 변경에 실패했습니다.')
  }

  if (rows.length === 0)
    return <p className="py-6 text-center text-[13px] text-slate-400">마감일이 지정된 작업이 없습니다.</p>

  const starts = rows.map((t) => (t.start ? ts(t.start) : ts(t.dueDate)))
  const ends = rows.map((t) => ts(t.dueDate))
  const min = Math.min(...starts, todayTs, ...(projectDue ? [ts(projectDue)] : [])) - 2 * DAY
  const max = Math.max(...ends, todayTs, ...(projectDue ? [ts(projectDue)] : [])) + 2 * DAY
  const span = Math.max(DAY, max - min)
  const pos = (t: number) => ((t - min) / span) * 100
  const todayP = pos(todayTs)
  const delayOf = (due: string) => Math.round((todayTs - ts(due)) / DAY)

  // 지연 요약
  const overdueRows = rows.filter((t) => ts(t.dueDate) < todayTs && t.status !== 'done')
  const maxDelay = overdueRows.reduce((m, t) => Math.max(m, delayOf(t.dueDate)), 0)

  // 월 눈금
  const ticks: { p: number; label: string }[] = []
  const d = new Date(min)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= max) {
    if (d.getTime() >= min) ticks.push({ p: pos(d.getTime()), label: `${d.getMonth() + 1}월` })
    d.setMonth(d.getMonth() + 1)
  }

  return (
    <div>
      {/* 지연 요약 */}
      {overdueRows.length > 0 && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-bold text-[#C00000]">
          지연 {overdueRows.length}건 · 최대 {maxDelay}일 밀림
        </div>
      )}

      {/* 월 눈금 헤더 — 막대 트랙과 같은 폭으로 정렬(라벨/날짜열 침범 방지) */}
      <div className="mb-1 flex items-center gap-2">
        <span className="w-28 shrink-0" />
        <div className="relative h-4 flex-1">
          {ticks.map((t, i) => (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400" style={{ left: `${t.p}%` }}>{t.label}</span>
          ))}
        </div>
        <span className="w-12 shrink-0" />
      </div>

      <div className="space-y-1.5">
        {rows.map((t) => {
          const s = t.start ? ts(t.start) : ts(t.dueDate)
          const e = ts(t.dueDate)
          const overdue = e < todayTs && t.status !== 'done'
          const delay = overdue ? delayOf(t.dueDate) : 0
          const color = overdue ? '#C00000' : COLOR[t.status] ?? '#94A3B8'
          const planLeft = pos(Math.min(s, e))
          const planRight = pos(Math.max(s, e))
          const planWidth = Math.max(2, planRight - planLeft)
          const tailWidth = overdue ? Math.max(0, todayP - planRight) : 0
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded ${t.editable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              onClick={() => openEdit(t)}
              title={t.editable ? '클릭해서 마감일 수정' : undefined}
            >
              <span className="w-28 shrink-0 truncate text-[12px] text-slate-600" title={t.title}>{t.title}</span>
              <div className="relative h-5 flex-1 rounded bg-slate-50">
                {ticks.map((tk, j) => (
                  <span key={j} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${tk.p}%` }} />
                ))}
                <span className="absolute inset-y-0 z-10 w-0.5 bg-navy-light" style={{ left: `${todayP}%` }} title="오늘" />
                {/* 계획 막대 (시작~마감) */}
                <span className="absolute top-1/2 z-20 h-3.5 -translate-y-1/2 rounded-full" style={{ left: `${planLeft}%`, width: `${planWidth}%`, background: color }} />
                {/* 지연 꼬리 (마감~오늘, 빗금) */}
                {overdue && tailWidth > 0.3 && (
                  <span
                    className="absolute top-1/2 z-20 h-3.5 -translate-y-1/2 rounded-r-full"
                    style={{ left: `${planRight}%`, width: `${tailWidth}%`, background: 'repeating-linear-gradient(45deg, #C00000 0 5px, #F4B4B4 5px 10px)' }}
                    title={`마감 ${t.dueDate} 대비 ${delay}일 지연`}
                  />
                )}
                {/* 마감 기준선 */}
                {overdue && (
                  <span className="absolute top-1/2 z-30 h-4 w-0.5 -translate-y-1/2 bg-[#7A0000]" style={{ left: `${planRight}%` }} title={`원래 마감 ${t.dueDate}`} />
                )}
              </div>
              <span className="w-12 shrink-0 text-right text-[10px] font-semibold" style={{ color }}>{overdue ? `+${delay}일` : t.dueDate.slice(5)}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#94A3B8' }} />할 일</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#E0A106' }} />진행 중</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#2E8540' }} />완료</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-navy-light" />오늘</span>
        {undated > 0 && <span className="ml-auto">마감 미정 {undated}건</span>}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="마감일 수정">
        {editing && <p className="mb-3 text-[13px] font-semibold text-navy">{editing.title}</p>}
        <Field label="마감일">
          <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>취소</Button>
          <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
