import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { team } = g.session.user
  if (!team) return NextResponse.json({ items: [], unread: 0 })

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientTeam: team },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { recipientTeam: team, read: false } }),
  ])
  return NextResponse.json({ items, unread })
}

// 본인 팀 알림 모두 읽음 처리
export async function PATCH() {
  const g = await guard()
  if (g.res) return g.res
  const { team } = g.session.user
  if (team) {
    await prisma.notification.updateMany({
      where: { recipientTeam: team, read: false },
      data: { read: true },
    })
  }
  return NextResponse.json({ ok: true })
}
