import { describe, it, expect } from 'vitest'
import { dateRange } from './calendar'

describe('dateRange', () => {
  it('당일은 하루만', () => {
    expect(dateRange('2026-10-13')).toEqual(['2026-10-13'])
  })
  it('월 경계를 넘는 범위', () => {
    expect(dateRange('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
  it('종료가 시작보다 앞서면 시작일만', () => {
    expect(dateRange('2026-10-13', '2026-10-10')).toEqual(['2026-10-13'])
  })
})
