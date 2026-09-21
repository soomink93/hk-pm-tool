import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'
import { notifyEscalationCreated } from '@/lib/notify'

// 단계별 알림 대상 결정권자
const TIER_DECIDER_ROLES: Record<string, string[]> = {
  '1단계': ['admin'],
  '2단계': ['executive', 'admin'],
  '3단계': ['chairman', 'president', 'admin'],
}

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const escalations = await prisma.escalation.findMany({ orderBy: { deadline: 'asc' } })
  return NextResponse.json(escalations)
}

export async function POST(req: Request) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const b = await req.json()
  const dept = String(b.dept ?? '')
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, dept)) return NextResponse.json({ error: '해당 팀의 결정 요청을 등록할 권한이 없습니다.' }, { status: 403 })
  const escalation = await prisma.escalation.create({
    data: {
      item: String(b.item ?? ''),
      tier: String(b.tier ?? ''),
      dept,
      needed: String(b.needed ?? ''),
      deadline: String(b.deadline ?? ''),
      status: String(b.status ?? '대기중'),
    },
  })
  await logAudit(g.session, 'create', 'escalation', escalation.id, `결정 요청 등록: ${escalation.item}`)
  await notifyEscalationCreated(
    {
      item: escalation.item,
      dept: escalation.dept,
      needed: escalation.needed,
      tier: escalation.tier,
      deadline: escalation.deadline,
      deciderRoles: TIER_DECIDER_ROLES[escalation.tier] ?? ['admin'],
    },
    g.session.user.id,
  )
  return NextResponse.json(escalation, { status: 201 })
}
