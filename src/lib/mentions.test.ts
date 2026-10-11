import { describe, it, expect } from 'vitest'
import { parseMentionNames } from './mentions'

describe('parseMentionNames', () => {
  it('extracts @names, dedupes, skips plain text and emails', () => {
    expect(parseMentionNames('@한민희 확인 부탁 @오장준 @한민희')).toEqual(['한민희', '오장준'])
    expect(parseMentionNames('멘션 없음')).toEqual([])
    expect(parseMentionNames('메일 a@bob.com 은 멘션 아님')).toEqual([]) // @ 앞이 문자 → 제외
  })
})
