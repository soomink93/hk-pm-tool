import { TABS } from './constants'

export type Role = 'admin' | 'chairman' | 'president' | 'executive' | 'teamlead'

export type Action =
  | 'kpi:write'
  | 'decision:write'
  | 'decision:view'
  | 'escalation:write'
  | 'user:manage'

// 전체 편집 권한(부문 무관): 관리자·회장·사장
export const FULL_EDIT_ROLES: Role[] = ['admin', 'chairman', 'president']
export const isFullEditor = (role: Role): boolean => FULL_EDIT_ROLES.includes(role)

const MATRIX: Record<Action, Role[]> = {
  'kpi:write': ['executive'], // + 부문 팀 범위로 추가 제한
  'decision:write': ['executive'], // 임원은 본인이 작성한 것만 수정/삭제
  'decision:view': ['executive'],
  'escalation:write': ['executive', 'teamlead'], // + 부문/팀 범위
  'user:manage': [], // 전체 편집자만
}

export const can = (role: Role, action: Action): boolean =>
  isFullEditor(role) || MATRIX[action].includes(role)

// 결정 단계(tier) ↔ 결정권자 레벨. 상위 역할은 하위 단계를 항상 처리 가능.
export const ROLE_RANK: Record<Role, number> = {
  teamlead: 1,
  executive: 2,
  president: 3,
  chairman: 3,
  admin: 99,
}
export const TIER_RANK: Record<string, number> = { '1단계': 1, '2단계': 2, '3단계': 3 }
export const TIER_DECIDER_LABEL: Record<string, string> = {
  '1단계': '팀장급',
  '2단계': '임원급',
  '3단계': '회장·사장',
}
// 해당 단계를 '완료(결정)' 처리할 권한이 있는가
export const canDecideTier = (role: Role, tier: string): boolean =>
  (ROLE_RANK[role] ?? 0) >= (TIER_RANK[tier] ?? 99)

export const visibleTabs = (role: Role): string[] =>
  TABS.filter((t) => (t.roles as readonly string[]).includes(role)).map((t) => t.id)
