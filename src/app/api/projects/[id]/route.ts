import { NextResponse } from 'next/server'
import type { Prisma, ProjectStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { canEditProject, type Role } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const STATUSES: ProjectStatus[] = ['active', 'onhold', 'done']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!canEditProject(g.session.user.role as Role, project.ownerId, g.session.user.id))
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const data: Prisma.ProjectUpdateInput = {}
  if (b.name !== undefined) {
    const n = String(b.name).trim()
    if (!n) return NextResponse.json({ error: '프로젝트 이름을 입력하세요.' }, { status: 400 })
    data.name = n
  }
  if (b.description !== undefined) data.description = String(b.description)
  if (b.dueDate !== undefined) data.dueDate = String(b.dueDate)
  if (b.status !== undefined && STATUSES.includes(b.status)) data.status = b.status as ProjectStatus
  if (b.ownerId !== undefined) {
    if (b.ownerId) {
      const u = await prisma.user.findUnique({ where: { id: String(b.ownerId) }, select: { id: true, name: true } })
      if (u) { data.ownerId = u.id; data.ownerName = u.name }
    } else { data.ownerId = null; data.ownerName = '' }
  }
  const updated = await prisma.project.update({ where: { id }, data })
  await logAudit(g.session, 'update', 'project', id, `프로젝트 수정: ${updated.name}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!canEditProject(g.session.user.role as Role, project.ownerId, g.session.user.id))
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  await prisma.project.delete({ where: { id } }) // 연결 항목은 onDelete: SetNull
  await logAudit(g.session, 'delete', 'project', id, `프로젝트 삭제: ${project.name}`)
  return NextResponse.json({ ok: true })
}
