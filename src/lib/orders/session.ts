// 수주 페이지/액션 공용: 로그인 사용자를 DB에서 매번 읽음(팀·역할 변경 즉시 반영) + 팀→부문 맵
import { redirect } from 'next/navigation'
import { auth } from '../auth'
import { prisma } from '../prisma'
import type { TeamDepts } from './perm'

export async function requireMe() {
  const s = await auth()
  if (!s?.user?.id) redirect('/login')
  const u = await prisma.user.findUnique({ where: { id: s.user.id }, select: { id: true, name: true, email: true, role: true, team: true, department: true } })
  if (!u) redirect('/login')
  return u
}

export async function teamDepts(): Promise<TeamDepts> {
  const teams = await prisma.team.findMany({ select: { name: true, department: true } })
  return Object.fromEntries(teams.map((t) => [t.name, t.department]))
}
