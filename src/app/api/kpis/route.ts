import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const kpis = await prisma.kpi.findMany({ where, orderBy: { team: 'asc' } })
  return NextResponse.json(kpis)
}

export async function POST(req: Request) {
  const g = await guard('kpi:write')
  if (g.res) return g.res
  const b = await req.json()
  const kpi = await prisma.kpi.create({
    data: {
      team: String(b.team ?? ''),
      metric: String(b.metric ?? ''),
      target: Number(b.target ?? 0),
      current: Number(b.current ?? 0),
      unit: String(b.unit ?? ''),
    },
  })
  return NextResponse.json(kpi, { status: 201 })
}
