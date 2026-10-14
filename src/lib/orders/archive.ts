// 완료 수주 → 분석용 기록 (계획 대비 실적). 화면과 CSV가 공용으로 사용
import { diffDays } from './stages'

type St = { seq: number; name: string; team: string; start: string; end: string; baseStart: string; baseEnd: string; status: string; startedAt: string | null; doneAt: string | null }
type Ord = { dueDate: string; completedAt: string | null }

// slip = 최초 계획 종료일 대비 실제 종료 차이, added = 이 단계(부서)가 새로 더한 지연 = slip − 앞 단계에서 넘어온 지연
export type StageRecord = { name: string; team: string; planDays: number; actualDays: number; slip: number; added: number; actualStart: string; actualEnd: string }

// 실제 착수일이 없으면 앞 단계 실제 완료일 → 그것도 없으면 계획 시작일로 대체. 실제 완료일 없으면 계획 종료일.
export function orderRecord(o: Ord, stages: St[]) {
  const live = stages.filter((s) => s.status !== 'skip').sort((a, b) => a.seq - b.seq)
  let prevDone: string | null = null
  let inherited = 0 // 앞 단계에서 넘어온 지연 (앞당겨 끝난 건 0으로 — 여유를 쓴 건 지연이 아님)
  const rows: StageRecord[] = live.map((s) => {
    const actualStart = s.startedAt ?? prevDone ?? s.start
    const actualEnd = s.doneAt ?? s.end
    const slip = diffDays(s.baseEnd, actualEnd) // 양수 = 최초 계획보다 늦게 끝남
    const added = slip - inherited
    prevDone = actualEnd
    inherited = Math.max(0, slip)
    return { name: s.name, team: s.team, planDays: diffDays(s.baseStart, s.baseEnd), actualDays: Math.max(0, diffDays(actualStart, actualEnd)), slip, added, actualStart, actualEnd }
  })
  const begin = live[0]?.baseStart ?? ''
  const finish = o.completedAt ?? rows.at(-1)?.actualEnd ?? ''
  const delay = o.dueDate && finish ? diffDays(o.dueDate, finish) : null
  return { rows, begin, finish, leadDays: begin && finish ? diffDays(begin, finish) : 0, delay, onTime: delay === null || delay <= 0 }
}

export type OrderRecord = ReturnType<typeof orderRecord>

// 전체 요약: 납기 준수율, 평균 리드타임, 단계별 평균 소요일(계획 vs 실제)
export function summarize(records: OrderRecord[]) {
  const n = records.length

  const byStage = new Map<string, { plan: number[]; actual: number[]; slip: number[] }>()
  for (const r of records) for (const s of r.rows) {
    const b = byStage.get(s.name) ?? { plan: [], actual: [], slip: [] }
    b.plan.push(s.planDays); b.actual.push(s.actualDays); b.slip.push(s.slip)
    byStage.set(s.name, b)
  }
  return {
    count: n,
    onTimeRate: n ? Math.round((records.filter((r) => r.onTime).length / n) * 100) : 0,
    avgLead: avg(records.map((r) => r.leadDays)),
    avgDelay: avg(records.map((r) => Math.max(0, r.delay ?? 0))),
    stages: [...byStage].map(([name, b]) => ({ name, count: b.plan.length, plan: avg(b.plan), actual: avg(b.actual), slip: avg(b.slip) })),
  }
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0)

// 부서별 병목: 직접 더한 지연(추가 지연 합계)이 클수록 병목. changes = 팀별 날짜 변경 횟수
export function byTeam(records: OrderRecord[], changes: Record<string, number> = {}) {
  const m = new Map<string, StageRecord[]>()
  for (const r of records) for (const s of r.rows) m.set(s.team, [...(m.get(s.team) ?? []), s])
  return [...m]
    .map(([team, xs]) => ({
      team,
      count: xs.length,
      plan: avg(xs.map((x) => x.planDays)),
      actual: avg(xs.map((x) => x.actualDays)),
      overrun: avg(xs.map((x) => x.actualDays - x.planDays)),
      lateRate: Math.round((xs.filter((x) => x.slip > 0).length / xs.length) * 100),
      addedDelay: xs.reduce((a, x) => a + Math.max(0, x.added), 0), // 이 부서에서 새로 생긴 지연(일)
      recovered: -xs.reduce((a, x) => a + Math.min(0, x.added), 0), // 앞에서 밀린 걸 만회한 일수
      changes: changes[team] ?? 0,
    }))
    .sort((a, b) => b.addedDelay - a.addedDelay || b.lateRate - a.lateRate)
}

// 제품 구분별 요약
export function byType<T extends string>(items: { type: T; r: OrderRecord }[]) {
  const m = new Map<T, OrderRecord[]>()
  for (const { type, r } of items) m.set(type, [...(m.get(type) ?? []), r])
  return [...m].map(([type, rs]) => ({ type, ...summarize(rs) }))
}

// CSV 한 칸 (쉼표·따옴표·줄바꿈 이스케이프, 엑셀 수식 주입 방지)
export const csvCell = (v: unknown) => {
  if (typeof v === 'number') return String(v) // 숫자(음수 포함)는 그대로 — 엑셀에서 숫자로 계산되게
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') // BOM: 엑셀 한글 깨짐 방지
