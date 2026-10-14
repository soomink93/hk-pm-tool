import { describe, expect, it } from 'vitest'
import { csvCell, orderRecord, summarize, toCsv } from './archive'

const st = (seq: number, name: string, base: [string, string], actual: [string | null, string | null], status = 'done') => ({
  seq, name, team: 't', start: base[0], end: base[1], baseStart: base[0], baseEnd: base[1], status, startedAt: actual[0], doneAt: actual[1],
})

describe('orderRecord', () => {
  it('computes plan vs actual, lead time and due-date delay', () => {
    const r = orderRecord({ dueDate: '2026-10-20', completedAt: '2026-10-22' }, [
      st(0, '영업접수', ['2026-10-01', '2026-10-03'], ['2026-10-01', '2026-10-04']),
      st(1, '설계', ['2026-10-03', '2026-10-10'], [null, null], 'skip'),
      st(2, '검사(QC)', ['2026-10-03', '2026-10-07'], [null, '2026-10-12']), // 착수일 없음 → 앞 단계 완료일
    ])
    expect(r.rows.map((x) => x.name)).toEqual(['영업접수', '검사(QC)']) // 생략 단계 제외
    expect(r.rows[0]).toMatchObject({ planDays: 2, actualDays: 3, slip: 1 })
    expect(r.rows[1]).toMatchObject({ actualStart: '2026-10-04', actualDays: 8, slip: 5 })
    expect(r).toMatchObject({ begin: '2026-10-01', finish: '2026-10-22', leadDays: 21, delay: 2, onTime: false })
  })

  it('falls back to plan dates for old data without actuals', () => {
    const r = orderRecord({ dueDate: '2026-10-10', completedAt: null }, [st(0, '출하', ['2026-10-01', '2026-10-05'], [null, null])])
    expect(r).toMatchObject({ finish: '2026-10-05', delay: -5, onTime: true })
  })
})

it('summarize averages per stage and on-time rate', () => {
  const a = orderRecord({ dueDate: '2026-10-10', completedAt: '2026-10-09' }, [st(0, '구매', ['2026-10-01', '2026-10-05'], ['2026-10-01', '2026-10-09'])])
  const b = orderRecord({ dueDate: '2026-10-10', completedAt: '2026-10-14' }, [st(0, '구매', ['2026-10-01', '2026-10-05'], ['2026-10-01', '2026-10-13'])])
  const s = summarize([a, b])
  expect(s).toMatchObject({ count: 2, onTimeRate: 50, avgDelay: 2 })
  expect(s.stages[0]).toMatchObject({ name: '구매', plan: 4, actual: 10, slip: 6 })
})

it('csv escapes and blocks formula injection', () => {
  expect(csvCell('a,b')).toBe('"a,b"')
  expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
  expect(csvCell(-110)).toBe('-110') // 숫자는 그대로
  expect(csvCell('-cmd')).toBe("'-cmd")
  expect(toCsv([['한글', 1]]).startsWith('﻿한글,1')).toBe(true)
})

it('byTeam attributes delay to the department that added it', async () => {
  const { byTeam } = await import('./archive')
  const mk = (seq: number, name: string, team: string, base: [string, string], done: string) => ({
    seq, name, team, start: base[0], end: base[1], baseStart: base[0], baseEnd: base[1], status: 'done', startedAt: null, doneAt: done,
  })
  // 구매가 5일 늦게 끝냄 → 생산은 그대로 5일 늦게(추가 0), QC는 2일 만회
  const r = orderRecord({ dueDate: '', completedAt: null }, [
    mk(0, '구매', '구매', ['2026-10-01', '2026-10-10'], '2026-10-15'),
    mk(1, '생산', '생산', ['2026-10-10', '2026-10-20'], '2026-10-25'),
    mk(2, '검사(QC)', '품질', ['2026-10-20', '2026-10-24'], '2026-10-27'),
  ])
  expect(r.rows.map((x) => x.added)).toEqual([5, 0, -2])
  const t = byTeam([r], { 구매: 2 })
  expect(t[0]).toMatchObject({ team: '구매', addedDelay: 5, lateRate: 100, changes: 2 })
  expect(t.find((x) => x.team === '품질')).toMatchObject({ addedDelay: 0, recovered: 2 })
})
