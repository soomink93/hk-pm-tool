import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const { id } = await params
  const b = await req.json()
  const decision = await prisma.decision.update({
    where: { id },
    data: {
      date: String(b.date ?? ''),
      content: String(b.content ?? ''),
      tier: String(b.tier ?? ''),
      decider: String(b.decider ?? ''),
      priority: String(b.priority ?? 'mid'),
      status: String(b.status ?? '진행중'),
    },
  })
  return NextResponse.json(decision)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const { id } = await params
  await prisma.decision.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
