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

// 본인 알림 모두 읽음 처리
export async function PATCH() {
  const g = await guard()
  if (g.res) return g.res
  await prisma.notification.updateMany({
    where: { recipientUserId: g.session.user.id, read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
