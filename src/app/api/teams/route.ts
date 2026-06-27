import { NextResponse } from 'next/server'
import type { TeamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const b = await req.json()
  const name = String(b.name ?? '').trim()
  if (!name) return NextResponse.json({ error: '팀명을 입력하세요.' }, { status: 400 })
  if (await prisma.team.findUnique({ where: { name } }))
    return NextResponse.json({ error: '이미 존재하는 팀명입니다.' }, { status: 409 })
  const team = await prisma.team.create({
    data: {
      name,
      lead: String(b.lead ?? ''),
      status: (b.status ?? 'gray') as TeamStatus,
      risk: String(b.risk ?? '없음'),
      escalation: String(b.escalation ?? '없음'),
      submitted: false,
    },
  })
  return NextResponse.json(team, { status: 201 })
}
