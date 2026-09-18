import { NextResponse } from 'next/server'
import type { Prisma, TeamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'

// 팀 상태/리스크 수정: 해당 부문 임원(또는 전체 편집자)만
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id } = await params
  const team = await prisma.team.findUnique({ where: { id } })
  if (!team) return NextResponse.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 })
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, team.name)) return NextResponse.json({ error: '해당 팀을 수정할 권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const data: Prisma.TeamUpdateInput = {}
  if (b.lead !== undefined) data.lead = String(b.lead)
  if (b.status !== undefined) data.status = b.status as TeamStatus
  if (b.risk !== undefined) data.risk = String(b.risk)
  if (b.escalation !== undefined) data.escalation = String(b.escalation)
  if (b.department !== undefined) data.department = String(b.department)
  const updated = await prisma.team.update({ where: { id }, data })
  await logAudit(g.session, 'update', 'team', id, `팀 수정: ${updated.name}`)
  return NextResponse.json(updated)
}

// 팀 삭제: 전체 편집자(관리자/회장/사장)만
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const { id } = await params
  const target = await prisma.team.findUnique({ where: { id }, select: { name: true } })
  await prisma.team.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'team', id, `팀 삭제: ${target?.name ?? ''}`)
  return NextResponse.json({ ok: true })
}
