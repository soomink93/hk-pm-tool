import { expect, test } from 'vitest'
import { canEditLocked, canEditStage, canSetType, isSales } from './perm'

const depts = { 국내영업팀: '국내영업', 해외영업팀: '국내영업', 영업관리: '국내영업', 구매팀: 'HK USA', PQ팀: 'HK USA', 제품개발팀: '기술연구소', QA팀: '기술지원' }
const u = (role: string, team: string | null, department: string | null = null, name = '홍길동') => ({ role: role as never, team, department, name })

test('sales permission: full editors + 국내영업 부문 (team leads and exec)', () => {
  expect(isSales(u('admin', null), depts)).toBe(true)
  expect(isSales(u('president', null), depts)).toBe(true)
  expect(isSales(u('teamlead', '해외영업팀'), depts)).toBe(true)
  expect(isSales(u('teamlead', '영업관리'), depts)).toBe(true)
  expect(isSales(u('executive', null, '국내영업'), depts)).toBe(true)
  expect(isSales(u('teamlead', '구매팀'), depts)).toBe(false)
  expect(isSales(u('executive', null, '기술연구소'), depts)).toBe(false)
})

test('stage edit: own team lead, department exec, assignee, sales', () => {
  const pq = { team: 'PQ팀', assignee: '' }
  expect(canEditStage(u('teamlead', 'PQ팀'), pq, depts)).toBe(true)
  expect(canEditStage(u('teamlead', '구매팀'), pq, depts)).toBe(false) // 같은 부문이어도 다른 팀 팀장은 불가
  expect(canEditStage(u('executive', null, 'HK USA'), pq, depts)).toBe(true) // 부문 임원
  expect(canEditStage(u('executive', null, '기술지원'), pq, depts)).toBe(false)
  expect(canEditStage(u('teamlead', 'QA팀', null, '김QA'), { team: 'PQ팀', assignee: '김QA' }, depts)).toBe(true)
  expect(canEditStage(u('teamlead', '국내영업팀'), pq, depts)).toBe(true) // 영업은 전체
  expect(canEditStage(u('teamlead', 'QA팀', null, ''), { team: 'PQ팀', assignee: '' }, depts)).toBe(false)
})

test('type change: sales + 기술연구소; locked edit: full editors only', () => {
  expect(canSetType(u('teamlead', '제품개발팀'), depts)).toBe(true)
  expect(canSetType(u('executive', null, '기술연구소'), depts)).toBe(true)
  expect(canSetType(u('teamlead', 'QA팀'), depts)).toBe(false)
  expect(canEditLocked(u('chairman', null))).toBe(true)
  expect(canEditLocked(u('teamlead', '국내영업팀'))).toBe(false)
})

test('orders visibility: admin always, others only after release', async () => {
  const { canSeeOrders } = await import('./perm')
  const { ORDERS_RELEASED, TABS } = await import('../constants')
  expect(canSeeOrders('admin')).toBe(true)
  for (const r of ['chairman', 'president', 'executive', 'teamlead'] as const) expect(canSeeOrders(r)).toBe(ORDERS_RELEASED)
  const tab = TABS.find((t) => t.id === 'orders')!
  expect((tab.roles as readonly string[]).includes('teamlead')).toBe(ORDERS_RELEASED)
})
