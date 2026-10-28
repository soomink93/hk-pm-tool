import { describe, expect, it } from 'vitest'
import { customerKey, sameCustomer } from './key'

describe('customerKey', () => {
  it('ignores corporate marks, spacing and case', () => {
    expect(customerKey('(주)에이스산업')).toBe('에이스산업')
    expect(customerKey(' ㈜ 에이스산업 ')).toBe('에이스산업')
    expect(customerKey('에이스산업 주식회사')).toBe('에이스산업')
    expect(customerKey('ACE Co., Ltd.')).toBe('ace')
    expect(customerKey('Ace  Inc')).toBe('ace')
  })

  it('keeps different companies apart', () => {
    expect(sameCustomer('에이스산업', '에이스산업2')).toBe(false)
    expect(sameCustomer('에이스 산업', '에이스산업')).toBe(false) // 띄어쓰기 차이는 합치지 않음
    expect(sameCustomer('(주)', '㈜')).toBe(false) // 표기만 있으면 빈 키 → 매칭 안 함
    expect(customerKey('Princeton Laser')).toBe('princeton laser') // 단어 안의 inc는 그대로
  })
})
