import { expect, test } from 'vitest'
import { accuracy, currentBottleneck, monthlyTrend, parseChangeLog, reasonStats } from './stats'

const rec = (lead: number, onTime: boolean) => ({ rows: [], begin: '', finish: '', leadDays: lead, delay: onTime ? 0 : 3, onTime })

test('monthlyTrend buckets by completion month, keeps empty months', () => {
  const t = monthlyTrend(
    [
      { finish: '2026-10-05', r: rec(30, true) },
      { finish: '2026-10-20', r: rec(50, false) },
      { finish: '2026-08-01', r: rec(20, true) },
    ],
    3,
    new Date('2026-10-13'),
  )
  expect(t.map((x) => x.month)).toEqual(['2026-08', '2026-09', '2026-10'])
  expect(t[2]).toEqual({ month: '2026-10', count: 2, onTimeRate: 50, avgLead: 40 })
  expect(t[1]).toEqual({ month: '2026-09', count: 0, onTimeRate: null, avgLead: null })
})

test('parseChangeLog reads stage, team and categorized reason', () => {
  expect(parseChangeLog('[구매] 종료 2026-12-01 → 2026-12-03 · 사유: [부품·자재 입고 지연] 실린더')).toEqual({ stage: '구매', reason: '부품·자재 입고 지연' })
  expect(parseChangeLog('[출하] 시작 … · 사유: 고객 요청으로 출하일 조정')).toMatchObject({ reason: '기타(미분류)' }) // 옛 자유입력
  expect(parseChangeLog('[구매] 상태 대기 → 완료')).toBeNull()
})

test('reasonStats counts, shares and top teams', () => {
  const team = (stage: string) => ({ 구매: '구매팀', 생산: 'PQ팀', 설계: '제어기술팀' })[stage] ?? ''
  const s = reasonStats(
    [
      '[구매] 종료 … · 사유: [부품·자재 입고 지연] a',
      '[생산] 종료 … · 사유: [부품·자재 입고 지연] b',
      '[구매] 종료 … · 사유: [부품·자재 입고 지연] c',
      '[설계] 종료 … · 사유: [고객 사양 변경]',
    ].map((text) => ({ text, team })),
  )
  expect(s[0]).toMatchObject({ reason: '부품·자재 입고 지연', count: 3, share: 75 })
  expect(s[0].teams[0]).toEqual({ team: '구매팀', n: 2 })
  expect(s[1].teams[0]).toEqual({ team: '제어기술팀', n: 1 }) // 수주별 실제 담당팀
})

test('currentBottleneck: holding, overdue stages and days per team', () => {
  const b = currentBottleneck(
    [
      { id: 'a', customer: 'A', product: 'p', stages: [
        { seq: 0, name: '구매', team: '구매', end: '2026-10-05', status: 'doing' },
        { seq: 1, name: '생산', team: '생산', end: '2026-10-20', status: 'todo' },
      ] },
      { id: 'b', customer: 'B', product: 'q', stages: [
        { seq: 0, name: '구매', team: '구매', end: '2026-10-01', status: 'done' },
        { seq: 1, name: '생산', team: '생산', end: '2026-10-10', status: 'todo' },
      ] },
    ],
    '2026-10-13',
  )
  expect(b[0]).toMatchObject({ team: '구매', holding: 1, doing: 1, late: 1, lateDays: 8 })
  expect(b[0].oldest).toMatchObject({ orderId: 'a', stage: '구매', days: 8 })
  expect(b[1]).toMatchObject({ team: '생산', holding: 1, late: 1, lateDays: 3 })
})

test('accuracy', () => {
  expect(accuracy(20, 26)).toBe(130)
  expect(accuracy(0, 3)).toBeNull()
})
