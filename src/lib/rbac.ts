import { TABS } from './constants'

export type Role = 'admin' | 'chairman' | 'executive' | 'teamlead'

export type Action =
  | 'kpi:write'
  | 'decision:write'
  | 'decision:view'
  | 'escalation:write'
  | 'user:manage'

const MATRIX: Record<Action, Role[]> = {
  'kpi:write': ['executive'],
  'decision:write': ['executive'],
  'decision:view': ['chairman', 'executive'],
  'escalation:write': ['executive', 'teamlead'],
  'user:manage': ['chairman', 'executive'],
}

// admin(최고관리자)은 모든 권한 허용
export const can = (role: Role, action: Action): boolean =>
  role === 'admin' || MATRIX[action].includes(role)

export const visibleTabs = (role: Role): string[] =>
  TABS.filter((t) => (t.roles as readonly string[]).includes(role)).map((t) => t.id)
