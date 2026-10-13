'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'

export type CalEvent = { id: string; date: string; title: string; memo: string | null; color: string }

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// 이벤트 색상 선택지 (예: 대체휴일=빨강, 전시회=주황 …)
const COLORS = [
  { v: '#C00000', name: '빨강' },
  { v: '#E36C09', name: '주황' },
  { v: '#E0A106', name: '노랑' },
  { v: '#2E8540', name: '초록' },
  { v: '#2E78D2', name: '파랑' },
  { v: '#8B5CF6', name: '보라' },
  { v: '#6B7280', name: '회색' },
]
const DEFAULT_COLOR = '#2E78D2'

// 대한민국 공휴일 (음력·대체공휴일 포함). ponytail: 하드코딩 — 연 1회 갱신 필요
const HOLIDAYS: Record<string, string> = {
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절', '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴', '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날', '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절', '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절', '2027-10-04': '대체공휴일', '2027-10-09': '한글날', '2027-10-11': '대체공휴일',
  '2027-12-25': '성탄절', '2027-12-27': '대체공휴일',
}

export function CalendarView({ events, canEdit }: { events: CalEvent[]; canEdit: boolean }) {
  const router = useRouter()
  const now = new Date()
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate())

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: todayStr, title: '', memo: '', color: DEFAULT_COLOR })
  const [busy, setBusy] = useState(false)

  // 날짜별 이벤트 묶기
  const byDate = useMemo(() => {
    const m: Record<string, CalEvent[]> = {}
    for (const e of events) (m[e.date] ??= []).push(e)
    return m
  }, [events])

  // 달력 셀 구성 (앞뒤 달 채우기, 6주 고정)
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay()
    const start = new Date(year, month, 1 - firstWeekday)
    return Array.from({ length: 6 * 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      return { date: ymd(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === month }
    })
  }, [year, month])

  function go(delta: number) {
    const m = month + delta
    setYear(year + Math.floor(m / 12))
    setMonth(((m % 12) + 12) % 12)
  }
  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  function openAdd(date: string) {
    if (!canEdit) return
    setEditId(null)
    setForm({ date, title: '', memo: '', color: DEFAULT_COLOR })
    setOpen(true)
  }
  function openEdit(e: CalEvent) {
    if (!canEdit) return
    setEditId(e.id)
    setForm({ date: e.date, title: e.title, memo: e.memo ?? '', color: e.color })
    setOpen(true)
  }
  async function save() {
    if (!form.title.trim()) return
    setBusy(true)
    const res = await fetch(editId ? `/api/calendar/${editId}` : '/api/calendar', {
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
  async function remove() {
    if (!editId || !confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/calendar/${editId}`, { method: 'DELETE' })
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else alert('삭제에 실패했습니다.')
  }

  const todayLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => go(-1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="이전 달">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xl font-bold text-navy">{year}년 {month + 1}월</span>
          <button onClick={() => go(1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="다음 달">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            오늘
          </button>
        </div>
        {canEdit && (
          <Button onClick={() => openAdd(todayStr)}>
            <Plus size={14} /> 일정 추가
          </Button>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-7 border-l border-t border-line">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`border-b border-r border-line py-2 text-center text-[13px] font-bold ${
                i === 0 ? 'text-[#C00000]' : i === 6 ? 'text-[#1F5FC0]' : 'text-slate-500'
              }`}
            >
              {w}
            </div>
          ))}
          {cells.map((c, i) => {
            const col = i % 7
            const isToday = c.date === todayStr
            const holiday = HOLIDAYS[c.date]
            const dayEvents = byDate[c.date] ?? []
            const weekendBg = col === 0 ? 'bg-red-50/40' : col === 6 ? 'bg-blue-50/40' : ''
            const isRed = col === 0 || !!holiday
            const numColor = !c.inMonth ? 'text-slate-300' : isRed ? 'text-[#C00000]' : col === 6 ? 'text-[#1F5FC0]' : 'text-slate-600'
            return (
              <div
                key={c.date + i}
                onClick={() => openAdd(c.date)}
                className={`min-h-28 border-b border-r border-line p-1.5 align-top ${weekendBg} ${
                  c.inMonth ? '' : 'bg-slate-50/60'
                } ${isToday ? 'ring-2 ring-inset ring-navy' : ''} ${canEdit ? 'cursor-pointer hover:bg-slate-50/70' : ''}`}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] font-bold ${
                      isToday ? 'bg-navy text-white' : numColor
                    }`}
                  >
                    {c.day}
                  </span>
                  {isToday && <span className="text-[11px] font-bold text-navy">오늘</span>}
                  {holiday && c.inMonth && <span className="truncate text-[11px] text-[#C00000]">{holiday}</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); openEdit(e) }}
                      title={`${e.title}${e.memo ? ` — ${e.memo}` : ''}`}
                      style={{ background: e.color || DEFAULT_COLOR }}
                      className={`truncate rounded px-1.5 py-0.5 text-[13px] font-medium text-white ${canEdit ? 'hover:opacity-85' : ''}`}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="px-1 text-[11px] text-slate-400">+{dayEvents.length - 4}건 더</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <p className="text-[12px] text-slate-400">
        오늘 · {todayLabel}
        {!canEdit && ' · 일정 추가·수정은 관리자와 신동준 이사만 할 수 있습니다.'}
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? '일정 수정' : '일정 추가'}>
        <Field label="날짜">
          <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="제목">
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 대체휴일, 회사 전시회" />
        </Field>
        <Field label="색상">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setForm({ ...form, color: c.v })}
                title={c.name}
                style={{ background: c.v }}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  form.color === c.v ? 'ring-2 ring-navy ring-offset-2' : 'hover:scale-110'
                }`}
              >
                {form.color === c.v && <Check size={14} className="text-white" />}
              </button>
            ))}
          </div>
        </Field>
        <Field label="메모 (선택)">
          <textarea className={`${inputClass} min-h-20`} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        </Field>
        <div className="mt-5 flex items-center justify-between">
          {editId ? (
            <button onClick={remove} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              <X size={14} /> 삭제
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
