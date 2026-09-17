import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'

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
  const team = String(b.team ?? '')
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, team)) return NextResponse.json({ error: '해당 팀을 수정할 권한이 없습니다.' }, { status: 403 })
  const kpi = await prisma.kpi.create({
    data: {
      team,
      metric: String(b.metric ?? ''),
      target: Number(b.target ?? 0),
      current: Number(b.current ?? 0),
      unit: String(b.unit ?? ''),
    },
  })
  return NextResponse.json(kpi, { status: 201 })
}
