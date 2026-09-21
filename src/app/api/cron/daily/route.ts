import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 매일 실행: ① Supabase keep-alive(자동 정지 방지) ② 지연/임박 작업 인앱 리마인더(이메일 없음)
async function run() {
  // ① keep-alive — 가벼운 쿼리로 DB 활동 유지
  await prisma.$queryRaw`SELECT 1`

  // ② 마감 리마인더 (인앱 알림만)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = await prisma.task.findMany({
    where: { status: { not: 'done' }, assigneeId: { not: null }, dueDate: { lt: today, not: '' } },
    select: { title: true, dueDate: true, assigneeId: true },
  })

  // 최근 20시간 내 동일 리마인더 중복 방지
  const since = new Date(Date.now() - 20 * 3_600_000)
  const recent = await prisma.notification.findMany({
    where: { kind: 'reminder', createdAt: { gte: since } },
    select: { recipientUserId: true, content: true },
  })
  const seen = new Set(recent.map((r) => `${r.recipientUserId}|${r.content}`))

  const toCreate = overdue
    .map((t) => ({
      recipientUserId: t.assigneeId!,
      fromTeam: '',
      toTeam: '',
      content: `지연 작업: ${t.title} (마감 ${t.dueDate})`,
      kind: 'reminder',
      href: '/my-tasks',
    }))
    .filter((n) => !seen.has(`${n.recipientUserId}|${n.content}`))

  if (toCreate.length) await prisma.notification.createMany({ data: toCreate })

  return { keepAlive: true, reminders: toCreate.length, overdue: overdue.length }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const authz = req.headers.get('authorization')
  if (!secret || authz !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ ok: true, ...(await run()) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
