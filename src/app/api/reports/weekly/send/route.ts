import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildWeeklyDigest, renderDigestHtml } from '@/lib/digest'
import { sendMail, mailConfigured } from '@/lib/mailer'

async function recipients(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['chairman', 'president', 'admin'] } },
    select: { email: true },
  })
  return users.map((u) => u.email).filter((e) => /@/.test(e))
}

async function run() {
  if (!mailConfigured())
    return NextResponse.json({ error: 'SMTP 미설정 — 환경변수(SMTP_HOST/USER/PASS)를 설정하세요.' }, { status: 400 })
  const to = await recipients()
  if (to.length === 0) return NextResponse.json({ error: '수신 대상(회장·사장·관리자)이 없습니다.' }, { status: 400 })

  const digest = await buildWeeklyDigest()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hk-pm-tool.vercel.app'
  const html = renderDigestHtml(digest, appUrl)
  const result = await sendMail({ to, subject: `[HK 주간 경영 요약] ${digest.rangeLabel}`, html })
  return NextResponse.json({ ok: true, sentTo: to, ...result })
}

// 관리자 수동 발송
export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  try {
    return await run()
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '발송 실패' }, { status: 500 })
  }
}

// Vercel Cron 발송 (Authorization: Bearer <CRON_SECRET>)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const authz = req.headers.get('authorization')
  if (!secret || authz !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return await run()
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '발송 실패' }, { status: 500 })
  }
}
