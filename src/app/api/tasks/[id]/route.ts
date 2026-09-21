import { NextResponse } from 'next/server'
import type { Prisma, TaskStatus } from '@prisma/client'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'
import { createCollabNotifications } from '@/lib/notify'
import { COLLAB_STATE_LABEL } from '@/lib/constants'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

// 연결된 협업 자동 완료: 협업의 모든 작업이 완료되면 협업도 완료 처리
async function syncCollabOnTaskDone(collaborationId: string | null, session: Session) {
  if (!collaborationId) return
  const collab = await prisma.collaboration.findUnique({ where: { id: collaborationId } })
  if (!collab || collab.status === 'done' || collab.status === 'declined') return
  const remaining = await prisma.task.count({ where: { collaborationId, status: { not: 'done' } } })
  if (remaining > 0) return
  await prisma.collaboration.update({ where: { id: collaborationId }, data: { status: 'done' } })
  await createCollabNotifications({
    teams: [collab.fromTeam, collab.toTeam],
    fromTeam: collab.fromTeam,
    toTeam: collab.toTeam,
    content: `[${COLLAB_STATE_LABEL.done}] ${collab.content} (작업 완료)`,
    kind: 'status',
    actorId: session.user.id,
  })
  await logAudit(session, 'status', 'collaboration', collaborationId, `협업 자동 완료(작업 완료): ${collab.fromTeam}→${collab.toTeam} ${collab.content}`)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const scope = await editableTeams(g.session)
  const teamEditor = canEditTeam(scope, task.team)
  const isAssignee = task.assigneeId === g.session.user.id
  if (!teamEditor && !isAssignee) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()

  // 담당자 본인(팀 편집권 없음)은 '내 작업'에서 상태만 변경 가능
  if (!teamEditor && isAssignee) {
    if (b.status === undefined || !STATUSES.includes(b.status))
      return NextResponse.json({ error: '상태만 변경할 수 있습니다.' }, { status: 403 })
    const updated = await prisma.task.update({ where: { id }, data: { status: b.status as TaskStatus } })
    await logAudit(g.session, 'status', 'task', id, `내 작업 상태변경: ${updated.title} (${updated.status})`)
    if (updated.status === 'done') await syncCollabOnTaskDone(updated.collaborationId, g.session)
    return NextResponse.json(updated)
  }

  const data: Prisma.TaskUpdateInput = {}
  if (b.title !== undefined) data.title = String(b.title)
  if (b.description !== undefined) data.description = String(b.description)
  if (b.assigneeId !== undefined) {
    // 계정 배정: 이름은 계정에서 파생. 빈 값이면 미지정으로 해제.
    if (b.assigneeId) {
      const u = await prisma.user.findUnique({ where: { id: String(b.assigneeId) }, select: { id: true, name: true } })
      if (u) {
        data.assigneeUser = { connect: { id: u.id } }
        data.assignee = u.name
      }
    } else {
      data.assigneeUser = { disconnect: true }
      if (b.assignee !== undefined) data.assignee = String(b.assignee)
    }
  } else if (b.assignee !== undefined) {
    data.assignee = String(b.assignee)
  }
  if (b.priority !== undefined) data.priority = String(b.priority)
  if (b.dueDate !== undefined) data.dueDate = String(b.dueDate)
  if (b.status !== undefined && STATUSES.includes(b.status)) data.status = b.status as TaskStatus
  // 팀 이동은 새 팀도 수정 권한 내여야 함
  if (b.team !== undefined && String(b.team) !== task.team) {
    if (!canEditTeam(scope, String(b.team)))
      return NextResponse.json({ error: '대상 팀 권한이 없습니다.' }, { status: 403 })
    data.team = String(b.team)
  }

  const updated = await prisma.task.update({ where: { id }, data })
  await logAudit(g.session, 'update', 'task', id, `작업 수정: ${updated.title} (${updated.status})`)
  if (updated.status === 'done' && task.status !== 'done') await syncCollabOnTaskDone(updated.collaborationId, g.session)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, task.team)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  await prisma.task.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'task', id, `작업 삭제: ${task.title}`)
  return NextResponse.json({ ok: true })
}
