import { expect, test } from 'vitest'
import { buildNav } from './nav'

const ALL = ['overview', 'calendar', 'projects', 'roadmap', 'master', 'orders', 'workload', 'weekly', 'my-tasks', 'collaboration', 'tasks', 'escalation', 'decisions', 'audit', 'requests', 'members', 'settings']

test('그룹 묶기 + 활성 그룹의 하위탭', () => {
  const { groups, sub } = buildNav(ALL, '/roadmap')
  const proj = groups.find((g) => g.label === '프로젝트')!
  expect(proj.items.map((i) => i.id)).toEqual(['projects', 'roadmap'])
  expect(proj.active).toBe(true)
  expect(sub.map((i) => i.id)).toEqual(['projects', 'roadmap'])
})

test('단일 항목 그룹은 그 항목 라벨, 하위탭 없음', () => {
  const { groups, sub } = buildNav(ALL, '/overview')
  expect(groups.some((g) => g.label === '전체 현황')).toBe(true)
  expect(sub).toEqual([])
})

test('권한으로 항목이 하나만 보이면 단일 탭처럼', () => {
  const noDecisions = ALL.filter((id) => id !== 'decisions') // 팀장: 결정 로그 접근 불가
  const { groups, sub } = buildNav(noDecisions, '/escalation')
  const g = groups.find((x) => x.items.some((i) => i.id === 'escalation'))!
  expect(g.label).toBe('결정 요청')
  expect(g.items).toHaveLength(1)
  expect(sub).toEqual([])
})

test('보이는 항목이 없는 그룹은 제외', () => {
  const { groups } = buildNav(['overview'], '/overview')
  expect(groups).toHaveLength(1)
})
