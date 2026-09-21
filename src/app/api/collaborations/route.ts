import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { createCollabNotifications } from '@/lib/notify'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user

  const where =
    role === 'teamlead'
      ? { OR: [{ fromTeam: team ?? '' }, { toTeam: team ?? '' }] }
      : {}

  const items = await prisma.collaboration.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      comments: { orderBy: { createdAt: 'asc' } },
      tasks: { select: { id: true, title: true, status: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json({ items, myTeam: team ?? '' })
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name, team } = g.session.user
  if (!team) return NextResponse.json({ error: '소속 팀이 없어 협업을 요청할 수 없습니다.' }, { status: 400 })

  const b = await req.json()
  const toTeam = String(b.toTeam ?? '').trim()
  const content = String(b.content ?? '').trim()
  if (!toTeam || !content) return NextResponse.json({ error: '대상 팀과 내용을 입력하세요.' }, { status: 400 })
  if (toTeam === team) return NextResponse.json({ error: '본인 팀에는 요청할 수 없습니다.' }, { status: 400 })

  const priority = ['high', 'mid', 'low'].includes(b.priority) ? String(b.priority) : 'mid'
  const dueDate = b.dueDate ? String(b.dueDate) : ''

  const collab = await prisma.collaboration.create({
    data: { fromTeam: team, toTeam, content, priority, dueDate, createdById: userId, createdByName: name ?? '', status: 'requested' },
  })
  await createCollabNotifications({
    teams: [toTeam],
    fromTeam: team,
    toTeam,
    content,
    kind: 'request',
    actorId: userId,
  })
  await logAudit(g.session, 'create', 'collaboration', collab.id, `협업 요청: ${team}→${toTeam} ${content}`)
  return NextResponse.json(collab, { status: 201 })
}
