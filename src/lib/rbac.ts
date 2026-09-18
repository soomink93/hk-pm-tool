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

export const visibleTabs = (role: Role): string[] =>
  TABS.filter((t) => (t.roles as readonly string[]).includes(role)).map((t) => t.id)
