import { prisma } from './prisma'

// 협업 관련 알림 생성: 지정 팀들의 팀장 + 전체 임원/관리자에게 (행위자 제외)
export async function createCollabNotifications(opts: {
  teams: string[]
  fromTeam: string
  toTeam: string
  content: string
  kind: 'request' | 'status' | 'comment'
  actorId: string
}) {
  const [leads, execs] = await Promise.all([
    prisma.user.findMany({ where: { role: 'teamlead', team: { in: opts.teams } }, select: { id: true } }),
    prisma.user.findMany({ where: { role: { in: ['executive', 'admin'] } }, select: { id: true } }),
  ])
  const ids = new Set<string>([...leads.map((l) => l.id), ...execs.map((e) => e.id)])
  ids.delete(opts.actorId)
  if (ids.size === 0) return
  await prisma.notification.createMany({
    data: [...ids].map((uid) => ({
      recipientUserId: uid,
      fromTeam: opts.fromTeam,
      toTeam: opts.toTeam,
      content: opts.content,
      kind: opts.kind,
      href: '/collaboration',
    })),
  })
}
