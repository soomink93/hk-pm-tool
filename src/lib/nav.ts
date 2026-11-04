// 상단 네비 시각적 그룹 — 라우트 접근권한(TABS/visibleTabs)은 그대로 두고, 묶어서 보여주기만.
import { TABS } from './constants'

// 각 그룹 = 상단 탭 하나. items는 TABS의 route id들(순서대로 하위 세그먼트).
export const NAV_GROUPS: { label: string; items: string[] }[] = [
  { label: '전체 현황', items: ['overview'] },
  { label: '캘린더', items: ['calendar'] },
  { label: '프로젝트', items: ['projects', 'roadmap'] },
  { label: '작업', items: ['my-tasks', 'collaboration', 'tasks'] },
  { label: '수주·생산', items: ['orders'] },
  { label: '기준정보', items: ['master'] },
  { label: '결정', items: ['escalation', 'decisions'] },
  { label: '관리자 요청', items: ['requests'] },
  { label: '관리', items: ['workload', 'weekly', 'audit', 'members', 'settings'] },
]

export type NavItem = { id: string; label: string; href: string }
export type NavGroup = { label: string; href: string; active: boolean; items: NavItem[] }

const LABEL = Object.fromEntries(TABS.map((t) => [t.id, t.label])) as Record<string, string>
const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')

// allowedIds = visibleTabs(role) 결과. pathname = 현재 경로.
export function buildNav(allowedIds: string[], pathname: string): { groups: NavGroup[]; sub: NavItem[] } {
  const groups: NavGroup[] = []
  for (const g of NAV_GROUPS) {
    const items: NavItem[] = g.items
      .filter((id) => allowedIds.includes(id))
      .map((id) => ({ id, label: LABEL[id] ?? id, href: `/${id}` }))
    if (items.length === 0) continue
    const active = items.some((it) => matches(pathname, it.href))
    // 보이는 항목이 하나뿐이면 단일 탭처럼(그 항목 라벨), 여러 개면 그룹 라벨
    groups.push({ label: items.length === 1 ? items[0].label : g.label, href: items[0].href, active, items })
  }
  const activeGroup = groups.find((g) => g.active)
  const sub = activeGroup && activeGroup.items.length > 1 ? activeGroup.items : []
  return { groups, sub }
}
