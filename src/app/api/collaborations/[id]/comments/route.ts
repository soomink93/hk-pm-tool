import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { createCollabNotifications } from '@/lib/notify'
import { isFullEditor, type Role } from '@/lib/rbac'
import { editableTeams, canEditTeam } from '@/lib/scope'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name, role } = g.session.user
  const { id } = await params

  const collab = await prisma.collaboration.findUnique({ where: { id } })
  if (!collab) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const scope = await editableTeams(g.session)
  const involved = isFullEditor(role as Role) || canEditTeam(scope, collab.fromTeam) || canEditTeam(scope, collab.toTeam)
  if (!involved) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const body = String(b.body ?? '').trim()
  if (!body) return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })

  const comment = await prisma.collaborationComment.create({
    data: { collaborationId: id, authorId: userId, authorName: name ?? '', body },
  })
  await prisma.collaboration.update({ where: { id }, data: { updatedAt: new Date() } })
  await createCollabNotifications({
    teams: [collab.fromTeam, collab.toTeam],
    fromTeam: collab.fromTeam,
    toTeam: collab.toTeam,
    content: `[댓글] ${body}`,
    kind: 'comment',
    actorId: userId,
  })
  return NextResponse.json(comment, { status: 201 })
}
