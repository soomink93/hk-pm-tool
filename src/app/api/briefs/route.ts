import { NextResponse } from 'next/server'
import type { TeamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { getWeek } from '@/lib/helpers'
import { createCollabNotifications } from '@/lib/notify'

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
  const { id: userId, name, role, team } = g.session.user
  if (role !== 'teamlead' || !team) {
    return NextResponse.json({ error: '팀장만 보고를 제출할 수 있습니다.' }, { status: 403 })
  }
  const b = await req.json()
  const status = String(b.status ?? 'green')
  const risk = String(b.risk ?? '없음') || '없음'
  const escalation = String(b.escalation ?? '없음') || '없음'

  type CollabInput = { team?: unknown; content?: unknown }
  const collaborations = Array.isArray(b.collaborations)
    ? (b.collaborations as CollabInput[])
        .map((c) => ({ team: String(c?.team ?? '').trim(), content: String(c?.content ?? '').trim() }))
        .filter((c) => c.team && c.content && c.team !== team)
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
      submittedAt: new Date().toLocaleDateString('ko-KR'),
    },
  })
  await prisma.team.update({
    where: { name: team },
    data: { submitted: true, status: status as TeamStatus, risk, escalation },
  })

  // 보고에 적은 협업 필요 사항 → 실제 협업 요청(엔티티) 생성 + 대상 팀/임원 알림
  for (const c of collaborations) {
    await prisma.collaboration.create({
      data: { fromTeam: team, toTeam: c.team, content: c.content, createdById: userId, createdByName: name ?? '', status: 'requested' },
    })
    await createCollabNotifications({
      teams: [c.team],
      fromTeam: team,
      toTeam: c.team,
      content: c.content,
      kind: 'request',
      actorId: userId,
    })
  }

  return NextResponse.json(brief, { status: 201 })
}
