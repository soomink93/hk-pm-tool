'use client'

import { useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import type { Stage, StageStatus } from '@prisma/client'
import { updateStage } from '@/app/(dashboard)/orders/actions'
import { DELAY_REASONS, addDays, diffDays, isLate, linkedShift, minDaysError, stageDef } from '@/lib/orders/stages'

const STATUS: Record<StageStatus, string> = { todo: '대기', doing: '진행', done: '완료', skip: '생략' }
const cell = 'rounded border border-line px-1.5 py-1 text-[12px] outline-none focus:border-navy-light disabled:border-transparent disabled:bg-transparent disabled:text-slate-500'

// 권한 없는 단계 행은 읽기 전용 — 권한 계산은 서버(lib/orders/perm)에서 하고 결과만 받음, 서버 액션도 같은 규칙으로 재확인
// canShift = 영업 권한(이후 단계 일괄 이동·담당팀 변경), teams = 담당팀 선택 목록
export function StageTable({ stages, editable, canShift, teams }: { stages: Stage[]; editable: Record<string, boolean>; canShift: boolean; teams: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-[13px]">
        <thead>
          <tr className="border-b-2 border-line text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <th className="py-2">단계</th><th>담당팀 / 담당자</th><th>시작</th><th>종료</th><th>상태</th><th>계획 대비</th><th />
          </tr>
        </thead>
        <tbody>{stages.map((s) => <StageRow key={`${s.id}-${s.start}-${s.end}-${s.status}-${s.assignee}-${s.team}`} s={s} editable={!!editable[s.id]} canShift={canShift} teams={teams} />)}</tbody>
      </table>
    </div>
  )
}

function StageRow({ s, editable, canShift, teams }: { s: Stage; editable: boolean; canShift: boolean; teams: string[] }) {
  const [v, setV] = useState({ start: s.start, end: s.end, status: s.status, assignee: s.assignee, team: s.team })
  const [reason, setReason] = useState({ category: '', detail: '' })
  const [shift, setShift] = useState(canShift)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  const def = stageDef(s.name)
  const min = def?.min ?? 1
  const tooShort = v.start && v.end ? minDaysError(s.name, v.start, v.end) : null
  const link = canShift && v.start && v.end ? linkedShift(s.name, s, v) : null
  const dateChanged = v.start !== s.start || v.end !== s.end
  const dirty = dateChanged || v.status !== s.status || v.assignee !== s.assignee || v.team !== s.team
  const slip = diffDays(s.baseEnd, s.end)
  const skip = s.status === 'skip'
  const reset = () => { setV({ start: s.start, end: s.end, status: s.status, assignee: s.assignee, team: s.team }); setReason({ category: '', detail: '' }); setError('') }
  const save = () => start(async () => setError((await updateStage(s.id, v, reason, canShift && shift && v.end !== s.end)) ?? ''))

  return (
    <>
      <tr className={`border-b border-slate-100 ${skip ? 'text-slate-300' : ''}`}>
        <td className="py-1.5 font-semibold">
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: def?.color }} />{s.name}
          {min > 1 && <span className="ml-1 text-[10px] font-normal text-teal-700">최소 {min}일</span>}
        </td>
        <td>
          {canShift && editable ? (
            <select value={v.team} onChange={(e) => setV({ ...v, team: e.target.value })} className={`${cell} mr-1 max-w-[7.5rem]`} title="담당팀 (영업만 변경)">
              {[...new Set([s.team, ...teams])].map((t) => <option key={t}>{t}</option>)}
            </select>
          ) : (
            <span className="mr-1 text-slate-500">{s.team}</span>
          )}
          <input value={v.assignee} disabled={!editable} onChange={(e) => setV({ ...v, assignee: e.target.value })} placeholder="담당자" className={`${cell} w-24`} />
        </td>
        <td><input type="date" value={v.start} disabled={!editable} onChange={(e) => setV({ ...v, start: e.target.value })} className={cell} /></td>
        <td><input type="date" value={v.end} disabled={!editable} min={v.start ? addDays(v.start, min) : undefined} onChange={(e) => setV({ ...v, end: e.target.value })} className={`${cell} ${isLate(s) ? 'border-red-400 text-red-600' : ''}`} /></td>
        <td>
          <select value={v.status} disabled={!editable} onChange={(e) => setV({ ...v, status: e.target.value as StageStatus })} className={cell}>
            {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {s.doneAt ? <div className="text-[10px] text-green-700">완료 {s.doneAt.slice(5)}</div> : s.startedAt ? <div className="text-[10px] text-amber-700">착수 {s.startedAt.slice(5)}</div> : null}
        </td>
        <td>{skip ? '-' : slip > 0 ? <span className="badge badge-red">+{slip}일</span> : slip < 0 ? <span className="badge badge-green">{slip}일</span> : <span className="text-slate-400">-</span>}</td>
        <td className="whitespace-nowrap text-right">
          {!editable && <span className="inline-flex text-slate-300" title="담당 부서·지정 담당자·영업·관리자만 수정"><Lock size={12} /></span>}
          {dirty && (
            <>
              <button onClick={save} disabled={pending || !!tooShort || (dateChanged && (!reason.category || (reason.category === '기타' && !reason.detail.trim())))} className="rounded bg-navy-light px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-40">저장</button>
              <button onClick={reset} className="ml-1 rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-600">취소</button>
            </>
          )}
        </td>
      </tr>
      {(dateChanged || error || (dirty && tooShort)) && (
        <tr className="bg-amber-50/60">
          <td colSpan={7} className="px-2 py-1.5">
            {dateChanged && (
              <div className="flex flex-wrap items-center gap-2">
                <select autoFocus value={reason.category} onChange={(e) => setReason({ ...reason, category: e.target.value })} className={`${cell} bg-white`}>
                  <option value="">변경 사유 선택 (필수)</option>
                  {DELAY_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input value={reason.detail} onChange={(e) => setReason({ ...reason, detail: e.target.value })} placeholder={reason.category === '기타' ? '상세 내용 (필수)' : '상세 내용 (선택) — 예: 실린더 수입 통관 지연'} className={`${cell} min-w-[240px] flex-1 bg-white`} />
                {link && !(shift && v.end !== s.end && s.name === '검사(QC)') && (
                  <span className="text-[12px] font-semibold text-teal-700">{link.partner}도 {link.delta > 0 ? '+' : ''}{link.delta}일 같이 이동 (QC·출하 연동)</span>
                )}
                {canShift && v.end !== s.end && (
                  <label className="flex items-center gap-1 text-[12px] text-slate-600">
                    <input type="checkbox" checked={shift} onChange={(e) => setShift(e.target.checked)} />이후 단계도 {diffDays(s.end, v.end) > 0 ? '+' : ''}{diffDays(s.end, v.end)}일 같이 이동
                  </label>
                )}
              </div>
            )}
            {(tooShort || error) && <p className="mt-1 text-[12px] text-red-600">{tooShort || error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}
