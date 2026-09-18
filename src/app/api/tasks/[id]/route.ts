import { NextResponse } from 'next/server'
import type { Prisma, TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, task.team)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const data: Prisma.TaskUpdateInput = {}
  if (b.title !== undefined) data.title = String(b.title)
  if (b.description !== undefined) data.description = String(b.description)
  if (b.assignee !== undefined) data.assignee = String(b.assignee)
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
