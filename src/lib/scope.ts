import type { Session } from 'next-auth'
import { prisma } from './prisma'
import { isFullEditor, type Role } from './rbac'

export type EditScope = 'all' | Set<string>

// 사용자가 '수정'할 수 있는 팀 집합. 전체 편집자는 'all'.
export async function editableTeams(session: Session): Promise<EditScope> {
  const role = session.user.role as Role
  const team = session.user.team
  const department = session.user.department

  if (isFullEditor(role)) return 'all'
  if (role === 'executive') {
    if (!department) return new Set()
    const teams = await prisma.team.findMany({ where: { department }, select: { name: true } })
    return new Set(teams.map((t) => t.name))
  }
  if (role === 'teamlead') return new Set(team ? [team] : [])
  return new Set()
}

export const canEditTeam = (scope: EditScope, name: string): boolean =>
  scope === 'all' || scope.has(name)

// 클라이언트로 넘길 직렬화 형태: 'all' | string[]
export const scopeToArray = (scope: EditScope): 'all' | string[] =>
  scope === 'all' ? 'all' : [...scope]
