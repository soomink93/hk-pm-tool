import { NextResponse } from 'next/server'
import type { CollabStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { createCollabNotifications, notifyTaskAssigned } from '@/lib/notify'
import { COLLAB_STATE_LABEL } from '@/lib/constants'
import { isFullEditor, type Role } from '@/lib/rbac'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'

const VALID: CollabStatus[] = ['requested', 'accepted', 'in_progress', 'done', 'declined']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name, role } = g.session.user
  const { id } = await params
  const b = await req.json()
  const status = String(b.status ?? '') as CollabStatus
  if (!VALID.includes(status)) return NextResponse.json({ error: '상태 값이 올바르지 않습니다.' }, { status: 400 })

  const collab = await prisma.collaboration.findUnique({ where: { id } })
  if (!collab) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const full = isFullEditor(role as Role)
  const scope = await editableTeams(g.session)
  const involved = full || canEditTeam(scope, collab.fromTeam) || canEditTeam(scope, collab.toTeam)
  if (!involved) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  if ((status === 'accepted' || status === 'declined') && !full && !canEditTeam(scope, collab.toTeam))
    return NextResponse.json({ error: '요청을 받은 팀만 수락/거절할 수 있습니다.' }, { status: 403 })

  // 거절 시 사유 필수
  const reason = String(b.reason ?? '').trim()
  if (status === 'declined' && !reason)
    return NextResponse.json({ error: '거절 사유를 입력하세요.' }, { status: 400 })

  const updated = await prisma.collaboration.update({ where: { id }, data: { status } })

  // 거절 사유를 댓글로 기록(요청 팀이 맥락 확인)
  if (status === 'declined' && reason) {
    await prisma.collaborationComment.create({
      data: { collaborationId: id, authorId: userId, authorName: name ?? '', body: `거절 사유: ${reason}` },
    })
  }

  // 수락 시 대상 팀 작업 보드에 작업 자동 생성 (중복 방지)
  if (status === 'accepted') {
    const exists = await prisma.task.findFirst({ where: { collaborationId: id } })
    if (!exists) {
      // 담당자(assigneeId) 지정 시: 대상 팀 소속이면 이름 파생 + 링크
      let assignee = ''
      let assigneeId: string | null = null
      if (b.assigneeId) {
        const u = await prisma.user.findUnique({
          where: { id: String(b.assigneeId) },
          select: { id: true, name: true, team: true },
        })
        if (u && u.team === collab.toTeam) {
          assignee = u.name
          assigneeId = u.id
        }
      }
      await prisma.task.create({
        data: {
          title: collab.content,
          description: `${collab.fromTeam} 협업 요청`,
          team: collab.toTeam,
          assignee,
          assigneeId,
          dueDate: b.dueDate ? String(b.dueDate) : '',
          status: 'todo',
          priority: 'mid',
          collaborationId: id,
          createdById: userId,
          createdByName: name ?? '',
        },
      })
      if (assigneeId)
        await notifyTaskAssigned({ assigneeId, title: collab.content, team: collab.toTeam, dueDate: b.dueDate ? String(b.dueDate) : '' }, userId)
    }
  }

  await createCollabNotifications({
    teams: [collab.fromTeam, collab.toTeam],
    fromTeam: collab.fromTeam,
    toTeam: collab.toTeam,
    content: `[${COLLAB_STATE_LABEL[status]}] ${collab.content}`,
    kind: 'status',
    actorId: userId,
  })
  await logAudit(g.session, 'status', 'collaboration', id, `협업 ${COLLAB_STATE_LABEL[status]}: ${collab.fromTeam}→${collab.toTeam} ${collab.content}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { role } = g.session.user
  const { id } = await params
  const collab = await prisma.collaboration.findUnique({ where: { id } })
  if (!collab) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const full = isFullEditor(role as Role)
  const scope = await editableTeams(g.session)
  if (!full && !canEditTeam(scope, collab.fromTeam))
    return NextResponse.json({ error: '요청한 팀만 취소할 수 있습니다.' }, { status: 403 })

  await prisma.collaboration.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'collaboration', id, `협업 취소: ${collab.fromTeam}→${collab.toTeam} ${collab.content}`)
  return NextResponse.json({ ok: true })
}
