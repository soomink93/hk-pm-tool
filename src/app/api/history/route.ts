import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

// 항목별 변경 이력: ?entity=task&id=<id> → 해당 항목의 감사 로그(최신순)
export async function GET(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') ?? ''
  const id = url.searchParams.get('id') ?? ''
  if (!entity || !id) return NextResponse.json({ items: [] })

  const logs = await prisma.auditLog.findMany({
    where: { entity, entityId: id },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { action: true, actorName: true, summary: true, createdAt: true },
  })
  return NextResponse.json({ items: logs })
}
