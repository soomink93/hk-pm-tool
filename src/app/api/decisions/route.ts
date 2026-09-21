import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const g = await guard('decision:view')
  if (g.res) return g.res
  const decisions = await prisma.decision.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(decisions)
}

export async function POST(req: Request) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const { id: userId, name } = g.session.user
  const b = await req.json()
  const CATEGORIES = ['예산', '인사', '계약', '전략', '운영', '기타']
  const category = CATEGORIES.includes(b.category) ? String(b.category) : '기타'
  const decision = await prisma.decision.create({
    data: {
      date: String(b.date ?? ''),
      content: String(b.content ?? ''),
      category,
      tier: String(b.tier ?? ''),
      decider: String(b.decider ?? ''),
      priority: String(b.priority ?? 'mid'),
      status: String(b.status ?? '완료'),
      createdById: userId,
      createdByName: name ?? '',
    },
  })
  await logAudit(g.session, 'create', 'decision', decision.id, `결정 추가: ${decision.content}`)
  return NextResponse.json(decision, { status: 201 })
}
