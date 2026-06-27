import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  const b = await req.json()
  const escalation = await prisma.escalation.update({
    where: { id },
    data: {
      item: String(b.item ?? ''),
      tier: String(b.tier ?? ''),
      dept: String(b.dept ?? ''),
      needed: String(b.needed ?? ''),
      deadline: String(b.deadline ?? ''),
      status: String(b.status ?? '대기중'),
    },
  })
  return NextResponse.json(escalation)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  await prisma.escalation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
