import { expect, test } from 'vitest'
import { expandBom, wouldCycle } from './bom'

const L = [
  { parentId: 'A', childId: 'B', qty: 2 },
  { parentId: 'B', childId: 'C', qty: 3 },
]

test('2단계 전개 — 소요량 곱', () => {
  expect(expandBom('A', L)).toEqual([
    { materialId: 'B', qty: 2, level: 1 },
    { materialId: 'C', qty: 6, level: 2 },
  ])
})

test('순환 참조 안전(무한루프 없음)', () => {
  const cyc = [
    { parentId: 'A', childId: 'B', qty: 1 },
    { parentId: 'B', childId: 'A', qty: 1 },
  ]
  expect(() => expandBom('A', cyc)).not.toThrow()
  expect(expandBom('A', cyc)).toEqual([{ materialId: 'B', qty: 1, level: 1 }])
})

test('wouldCycle: 추가하면 순환이 되는 간선 차단', () => {
  const lines = [{ parentId: 'A', childId: 'B', qty: 1 }]
  // A→B 가 있는데 B→A 를 추가하면 순환
  expect(wouldCycle('B', 'A', lines)).toBe(true)
  // 자기 자신
  expect(wouldCycle('A', 'A', lines)).toBe(true)
  // 정상(새 하위)
  expect(wouldCycle('B', 'C', lines)).toBe(false)
  // 간접 순환: A→B, B→C 있는데 C→A 추가
  const deep = [...lines, { parentId: 'B', childId: 'C', qty: 1 }]
  expect(wouldCycle('C', 'A', deep)).toBe(true)
})
