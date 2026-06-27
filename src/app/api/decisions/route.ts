import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard('decision:view')
  if (g.res) return g.res
  const decisions = await prisma.decision.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(decisions)
}

export async function POST(req: Request) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const b = await req.json()
  const decision = await prisma.decision.create({
    data: {
      date: String(b.date ?? ''),
      content: String(b.content ?? ''),
      tier: String(b.tier ?? ''),
      decider: String(b.decider ?? ''),
      priority: String(b.priority ?? 'mid'),
      status: String(b.status ?? '진행중'),
    },
  })
  return NextResponse.json(decision, { status: 201 })
}
