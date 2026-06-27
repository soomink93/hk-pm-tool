import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const escalations = await prisma.escalation.findMany({ orderBy: { deadline: 'asc' } })
  return NextResponse.json(escalations)
}

export async function POST(req: Request) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const b = await req.json()
  const escalation = await prisma.escalation.create({
    data: {
      item: String(b.item ?? ''),
      tier: String(b.tier ?? ''),
      dept: String(b.dept ?? ''),
      needed: String(b.needed ?? ''),
      deadline: String(b.deadline ?? ''),
      status: String(b.status ?? '대기중'),
    },
  })
  return NextResponse.json(escalation, { status: 201 })
}
