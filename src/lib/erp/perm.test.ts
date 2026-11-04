import { expect, test } from 'vitest'
import { canEditPartner, canEditMaterial, canEditBom } from './perm'

const depts = { 국내영업팀: '국내영업', 해외영업팀: '국내영업', 제품개발팀: '기술연구소' }
const u = (role: string, team: string | null, department: string | null = null, name = '홍길동') =>
  ({ role: role as never, team, department, name })

test('canEditPartner: 영업 + full editor만', () => {
  expect(canEditPartner(u('teamlead', '국내영업팀'), depts)).toBe(true)
  expect(canEditPartner(u('admin', null), depts)).toBe(true)
  expect(canEditPartner(u('teamlead', '제품개발팀'), depts)).toBe(false)
})

test('canEditMaterial: 생산·연구 + full editor', () => {
  expect(canEditMaterial(u('teamlead', '제품개발팀'), depts)).toBe(true) // 기술연구소
  expect(canEditMaterial(u('admin', null), depts)).toBe(true)
  expect(canEditMaterial(u('teamlead', '국내영업팀'), depts)).toBe(false)
})

test('canEditBom: 연구 + full editor', () => {
  expect(canEditBom(u('executive', null, '기술연구소'), depts)).toBe(true)
  expect(canEditBom(u('admin', null), depts)).toBe(true)
  expect(canEditBom(u('teamlead', '국내영업팀'), depts)).toBe(false)
})
