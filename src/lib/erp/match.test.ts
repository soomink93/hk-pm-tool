import { expect, test } from 'vitest'
import { matchMaterialId } from './match'

// 거래처 자동연결은 lib/customers/key.ts(customerKey)가 담당하므로 여기선 품목만.
const M = [{ id: 'm', name: 'FC3015', code: 'FC3015', modelBase: 'FC', size: '3015' }]

test('품목: code 또는 modelBase+size 유일 일치', () => {
  expect(matchMaterialId(' fc3015 ', M)).toBe('m')
})

test('품목: 빈 입력이면 null', () => {
  expect(matchMaterialId('   ', M)).toBeNull()
})

test('품목: 동일 모델 2건 이상이면 null(추측 금지)', () => {
  const dup = [...M, { id: 'm2', name: 'FC3015 특판', code: 'FC3015-B', modelBase: 'FC', size: '3015' }]
  expect(matchMaterialId('FC3015', dup)).toBeNull()
})
