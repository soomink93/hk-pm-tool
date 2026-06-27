import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('kpi:write')
  if (g.res) return g.res
  const { id } = await params
  const b = await req.json()
  const kpi = await prisma.kpi.update({
    where: { id },
    data: {
      team: String(b.team ?? ''),
      metric: String(b.metric ?? ''),
      target: Number(b.target ?? 0),
      current: Number(b.current ?? 0),
      unit: String(b.unit ?? ''),
    },
  })
  return NextResponse.json(kpi)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('kpi:write')
  if (g.res) return g.res
  const { id } = await params
  await prisma.kpi.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
