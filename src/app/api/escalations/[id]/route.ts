import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  const esc = await prisma.escalation.findUnique({ where: { id } })
  if (!esc) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const b = await req.json()
  const newDept = String(b.dept ?? esc.dept)
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, esc.dept) || !canEditTeam(scope, newDept))
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const updated = await prisma.escalation.update({
    where: { id },
    data: {
      item: String(b.item ?? ''),
      tier: String(b.tier ?? ''),
      dept: newDept,
      needed: String(b.needed ?? ''),
      deadline: String(b.deadline ?? ''),
      status: String(b.status ?? '대기중'),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  const esc = await prisma.escalation.findUnique({ where: { id } })
  if (!esc) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, esc.dept)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  await prisma.escalation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
