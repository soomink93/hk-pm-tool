import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// 사용자에 지정된 팀이 없으면 자동 생성. 생성했으면 새 팀 id, 아니면 null.
export async function ensureTeam(name: string | null, department: string | null, leadName: string): Promise<string | null> {
  if (!name) return null
  const exists = await prisma.team.findUnique({ where: { name }, select: { id: true } })
  if (exists) return null
  try {
    const team = await prisma.team.create({ data: { name, lead: leadName, department } })
    return team.id
  } catch (e) {
    // 동시 생성으로 이미 존재(name unique) → 무시
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null
    throw e
  }
}
