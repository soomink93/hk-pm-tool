import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const userId = g.session.user.id

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, read: false } }),
  ])
  return NextResponse.json({ items, unread })
}

// 본인 알림 읽음 처리: body { id } 있으면 그 하나만, 없으면 전체
export async function PATCH(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const uid = g.session.user.id
  const body = await req.json().catch(() => ({} as { id?: string }))
  // 수주 '업데이트 필요'는 확인 완료·단계 수정 전까지 유지
  const where = body?.id
    ? { id: String(body.id), recipientUserId: uid, kind: { not: 'order_change' } }
    : { recipientUserId: uid, read: false, kind: { not: 'order_change' } }
  await prisma.notification.updateMany({ where, data: { read: true } })
  return NextResponse.json({ ok: true })
}
