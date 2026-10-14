import { describe, expect, it } from 'vitest'
import { redact } from './redact'

const r = (s: string) => redact(s).text

describe('redact', () => {
  it('masks money in every common form', () => {
    expect(r('계약 금액: 120,000,000원')).not.toMatch(/\d/)
    expect(r('공급가액 | 1.2억 | 부가세 별도')).not.toMatch(/\d/)
    expect(r('총 1억 2천만원으로 한다')).not.toMatch(/1억|2천만원/)
    expect(r('단가 ₩35,000')).not.toMatch(/35/)
    expect(r('USD 50,000 / $12,500')).not.toMatch(/50,000|12,500/)
    expect(r('금 일억이천만원정')).toBe('[금액]')
    expect(r('합계 3500000')).not.toMatch(/\d/)
    expect(r('대금은 1,250,000,000 으로')).not.toMatch(/\d/)
    expect(r('3,000달러')).toBe('[금액]')
  })

  it('masks bare table numbers when a unit header exists', () => {
    expect(r('(단위: 천원)\n유압펌프 20 1,500 30,000')).not.toMatch(/1,500|30,000/)
    expect(r('유압펌프 1,500대')).toBe('유압펌프 1,500대') // 단위 헤더 없으면 수량 유지
  })

  it('masks personal and account info', () => {
    expect(r('담당 hong@corp.co.kr 010-1234-5678')).toBe('담당 [이메일] [전화]')
    expect(r('사업자 123-45-67890')).toBe('사업자 [사업자번호]')
    expect(r('입금 계좌: 국민 123456-01-234567')).not.toMatch(/\d/)
  })

  it('keeps the non-sensitive content needed for extraction', () => {
    const s = '고객사: 대한중공업\n품목: 유압 펌프 HP-200\n수량: 20대\n납기: 2026-12-20\n특약사항: 지체상금 일 0.1%, ANSI 150 플랜지'
    expect(r(s)).toBe(s)
  })

  it('counts replacements', () => {
    expect(redact('a@b.com 010-1111-2222').count).toBe(2)
  })
})
