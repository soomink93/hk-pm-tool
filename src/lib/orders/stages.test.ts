import { expect, test } from 'vitest'
import { FLOWS, addDays, currentStage, delayDays, diffDays, isLate, minDaysError, planStages, type Flow } from './stages'

const qc = (p: ReturnType<typeof planStages>) => p.find((s) => s.name === '검사(QC)')!

test('date helpers', () => {
  expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  expect(diffDays('2026-10-01', '2026-11-01')).toBe(31)
})

test('each flow follows its stage order and chains with no gaps', () => {
  expect(planStages('custom', '2026-10-01').map((s) => s.name).slice(0, 2)).toEqual(['설계검토', '영업접수'])
  expect(planStages('oem', '2026-10-01').map((s) => s.name)).toEqual(['영업접수', '검사(QC)', '출하'])
  expect(planStages('mass', '2026-10-01').map((s) => s.name)).not.toContain('설계')
  for (const f of Object.keys(FLOWS) as Flow[]) {
    const p = planStages(f, '2026-10-01', '2026-12-31')
    expect(p[0].start).toBe('2026-10-01')
    for (let i = 1; i < p.length; i++) expect(p[i].start).toBe(p[i - 1].end)
    expect(p.at(-1)!.end).toBe('2026-12-31') // 납기에 정확히 맞춤
    expect(diffDays(qc(p).start, qc(p).end)).toBeGreaterThanOrEqual(4)
  }
})

test('QC keeps 4 days even when the window is short', () => {
  const p = planStages('undecided', '2026-10-01', '2026-10-20') // 19일 / 기본합 65일
  expect(diffDays(qc(p).start, qc(p).end)).toBeGreaterThanOrEqual(4)
  expect(p.at(-1)!.end).toBe('2026-10-20')
  for (const s of p) expect(diffDays(s.start, s.end)).toBeGreaterThanOrEqual(1)
})

test('impossible window overflows but still respects minimums', () => {
  const p = planStages('oem', '2026-10-01', '2026-10-03')
  expect(diffDays(qc(p).start, qc(p).end)).toBe(4)
  expect(p.at(-1)!.end > '2026-10-03').toBe(true)
})

test('minDaysError enforces QC >= 4 days', () => {
  expect(minDaysError('검사(QC)', '2026-10-01', '2026-10-04')).toMatch(/4일/)
  expect(minDaysError('검사(QC)', '2026-10-01', '2026-10-05')).toBeNull()
  expect(minDaysError('설계', '2026-10-01', '2026-10-01')).toMatch(/1일/)
})

test('current stage, delay, late', () => {
  const p = planStages('undecided', '2026-10-01', '2026-12-31').map((s) => ({ ...s, status: s.seq < 2 ? 'done' : s.status }))
  expect(currentStage(p)?.name).toBe('설계')
  expect(delayDays('2026-12-31', p)).toBe(0)
  p[6] = { ...p[6], end: '2027-01-05' }
  expect(delayDays('2026-12-31', p)).toBe(5)
  expect(delayDays('', p)).toBe(0)
  expect(isLate(p[2], '2027-01-01')).toBe(true)
  expect(isLate(p[0], '2027-01-01')).toBe(false)
  expect(currentStage(p.map((s) => ({ ...s, status: 'done' })))).toBeNull()
})

test('QC and 출하 move together', async () => {
  const { linkedShift } = await import('./stages')
  // 출하를 3일 미루면 QC도 +3
  expect(linkedShift('출하', { start: '2026-12-10', end: '2026-12-12' }, { start: '2026-12-13', end: '2026-12-15' })).toEqual({ partner: '검사(QC)', delta: 3 })
  // QC 종료를 2일 당기면 출하도 -2
  expect(linkedShift('검사(QC)', { start: '2026-12-01', end: '2026-12-10' }, { start: '2026-12-01', end: '2026-12-08' })).toEqual({ partner: '출하', delta: -2 })
  // 출하 종료만 늘리면(시작 그대로) QC는 안 움직임
  expect(linkedShift('출하', { start: '2026-12-10', end: '2026-12-12' }, { start: '2026-12-10', end: '2026-12-20' })).toBeNull()
  expect(linkedShift('생산', { start: '2026-12-01', end: '2026-12-05' }, { start: '2026-12-03', end: '2026-12-07' })).toBeNull()
})

test('affectedTeams: changed stage onward, not done, deduped', async () => {
  const { affectedTeams } = await import('./stages')
  const p = planStages('undecided', '2026-10-01').map((s) => ({ ...s, status: s.seq === 4 ? 'done' : s.status }))
  // 구매(seq3) 변경 → 구매, (생산 완료 제외), 품질, 영업
  expect(affectedTeams(p, 3)).toEqual(['구매팀', 'QA팀', '국내영업팀'])
  expect(affectedTeams(p)).toEqual(['국내영업팀', '제품개발팀', '구매팀', 'QA팀'])
  expect(affectedTeams(p, 6, ['검사(QC)'])).toEqual(['QA팀', '국내영업팀'])
})

test('nextStage skips done/skip stages, null at the end', async () => {
  const { nextStage } = await import('./stages')
  const p = planStages('undecided', '2026-10-01').map((s) => ({ ...s, status: s.seq === 2 ? 'skip' : s.seq === 3 ? 'done' : s.status }))
  expect(nextStage(p, 1)?.name).toBe('생산') // 설계 생략, 구매 완료 → 생산
  expect(nextStage(p, 5)?.name).toBe('출하')
  expect(nextStage(p, 6)).toBeNull()
})

test('salesTeam overrides 영업접수·출하 team only', () => {
  const p = planStages('oem', '2026-10-01', undefined, '해외영업팀')
  expect(p.map((s) => s.team)).toEqual(['해외영업팀', 'QA팀', '해외영업팀'])
  expect(planStages('mass', '2026-10-01').find((s) => s.name === '생산')?.team).toBe('PQ팀')
})
