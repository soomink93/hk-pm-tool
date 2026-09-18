import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('kpi:write')
  if (g.res) return g.res
  const { id } = await params
  const kpi = await prisma.kpi.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const b = await req.json()
  const newTeam = String(b.team ?? kpi.team)
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, kpi.team) || !canEditTeam(scope, newTeam))
    return NextResponse.json({ error: '해당 팀을 수정할 권한이 없습니다.' }, { status: 403 })

  const updated = await prisma.kpi.update({
    where: { id },
    data: {
      team: newTeam,
      metric: String(b.metric ?? ''),
      target: Number(b.target ?? 0),
      current: Number(b.current ?? 0),
      unit: String(b.unit ?? ''),
    },
  })
  await logAudit(g.session, 'update', 'kpi', id, `KPI 수정: ${updated.team} ${updated.metric}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('kpi:write')
  if (g.res) return g.res
  const { id } = await params
  const kpi = await prisma.kpi.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, kpi.team))
    return NextResponse.json({ error: '해당 팀을 수정할 권한이 없습니다.' }, { status: 403 })
  await prisma.kpi.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'kpi', id, `KPI 삭제: ${kpi.team} ${kpi.metric}`)
  return NextResponse.json({ ok: true })
}
