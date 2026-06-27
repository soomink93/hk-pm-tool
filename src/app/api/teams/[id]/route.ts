import { NextResponse } from 'next/server'
import type { Prisma, TeamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const { id } = await params
  const b = await req.json()
  const data: Prisma.TeamUpdateInput = {}
  if (b.lead !== undefined) data.lead = String(b.lead)
  if (b.status !== undefined) data.status = b.status as TeamStatus
  if (b.risk !== undefined) data.risk = String(b.risk)
  if (b.escalation !== undefined) data.escalation = String(b.escalation)
  const team = await prisma.team.update({ where: { id }, data })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const { id } = await params
  await prisma.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
