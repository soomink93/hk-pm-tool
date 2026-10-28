import { expect, test } from 'vitest'
import { nextPartnerCode, nextMaterialCode } from './code'

test('nextPartnerCode: 접두 C/S/B + 같은 접두 최대 일련번호+1(6자리)', () => {
  expect(nextPartnerCode('customer', ['C000001', 'C000003', 'S000009'])).toBe('C000004')
  expect(nextPartnerCode('supplier', [])).toBe('S000001')
  expect(nextPartnerCode('both', ['B000010'])).toBe('B000011')
})

test('nextMaterialCode: 유형접두 + 일련번호', () => {
  expect(nextMaterialCode('FG', ['FG000002'])).toBe('FG000003')
  expect(nextMaterialCode('PART', [])).toBe('PT000001')
})
