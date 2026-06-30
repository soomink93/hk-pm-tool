import { NextResponse } from 'next/server'
import type { TeamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { getWeek } from '@/lib/helpers'

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const briefs = await prisma.brief.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(briefs)
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  if (role !== 'teamlead' || !team) {
    return NextResponse.json({ error: '팀장만 보고를 제출할 수 있습니다.' }, { status: 403 })
  }
  const b = await req.json()
  const status = String(b.status ?? 'green')
  const risk = String(b.risk ?? '없음') || '없음'
  const escalation = String(b.escalation ?? '없음') || '없음'

  type CollabInput = { team?: unknown; content?: unknown; status?: unknown }
  const collaborations = Array.isArray(b.collaborations)
    ? (b.collaborations as CollabInput[])
        .map((c) => ({
          team: String(c?.team ?? ''),
          content: String(c?.content ?? ''),
          status: String(c?.status ?? '요청예정'),
        }))
        .filter((c) => c.team || c.content)
    : []

  const brief = await prisma.brief.create({
    data: {
      team,
      week: getWeek(),
      completed: String(b.completed ?? ''),
      nextGoal: String(b.nextGoal ?? ''),
      risk,
      escalation,
      status,
      collaborations,
      submittedAt: new Date().toLocaleDateString('ko-KR'),
    },
  })
  await prisma.team.update({
    where: { name: team },
    data: { submitted: true, status: status as TeamStatus, risk, escalation },
  })

  // 협업 요청 알림: 대상 팀 팀장 + 전체 임원에게 사용자별 생성 (제출자 제외)
  const targets = collaborations.filter((c) => c.team && c.team !== team && c.content)
  if (targets.length) {
    const submitterId = g.session.user.id
    const execs = await prisma.user.findMany({ where: { role: { in: ['executive', 'admin'] } }, select: { id: true } })
    const notiData: { recipientUserId: string; fromTeam: string; toTeam: string; content: string }[] = []
    for (const c of targets) {
      const leads = await prisma.user.findMany({ where: { role: 'teamlead', team: c.team }, select: { id: true } })
      const ids = new Set<string>([...leads.map((l) => l.id), ...execs.map((e) => e.id)])
      ids.delete(submitterId)
      for (const uid of ids) notiData.push({ recipientUserId: uid, fromTeam: team, toTeam: c.team, content: c.content })
    }
    if (notiData.length) await prisma.notification.createMany({ data: notiData })
  }

  return NextResponse.json(brief, { status: 201 })
}
