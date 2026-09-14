import { NextResponse } from 'next/server'
import type { Prisma, TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

async function canEdit(id: string, role: string, team: string | undefined) {
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return { task: null, ok: false }
  if (role === 'chairman') return { task, ok: false }
  const ok = role === 'admin' || role === 'executive' || (role === 'teamlead' && task.team === team)
  return { task, ok }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  const { id } = await params
  const { task, ok } = await canEdit(id, role, team)
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const data: Prisma.TaskUpdateInput = {}
  if (b.title !== undefined) data.title = String(b.title)
  if (b.description !== undefined) data.description = String(b.description)
  if (b.assignee !== undefined) data.assignee = String(b.assignee)
  if (b.priority !== undefined) data.priority = String(b.priority)
  if (b.dueDate !== undefined) data.dueDate = String(b.dueDate)
  if (b.status !== undefined && STATUSES.includes(b.status)) data.status = b.status as TaskStatus
  // 임원/관리자만 팀 변경 허용
  if (b.team !== undefined && (role === 'admin' || role === 'executive')) data.team = String(b.team)

  const updated = await prisma.task.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  const { id } = await params
  const { task, ok } = await canEdit(id, role, team)
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
