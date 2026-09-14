import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TeamleadBrief } from '@/components/dashboard/TeamleadBrief'
import { TeamsBriefView } from '@/components/dashboard/TeamsBriefView'

export const dynamic = 'force-dynamic'

export default async function BriefPage() {
  const session = await auth()
  const { role, team } = session!.user

  const allTeams = await prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } })
  const teamNames = allTeams.map((t) => t.name)

  if (role === 'teamlead') {
    const [myTeam, briefs] = await Promise.all([
      prisma.team.findUnique({ where: { name: team } }),
      prisma.brief.findMany({ where: { team }, orderBy: { createdAt: 'desc' } }),
    ])
    const last = briefs[0]
    return (
      <TeamleadBrief
        team={team}
        status={myTeam?.status ?? 'green'}
        last={last ? { completed: last.completed, nextGoal: last.nextGoal, risk: last.risk, escalation: last.escalation } : null}
        teams={teamNames}
        briefs={briefs.map((b) => ({
          id: b.id,
          completed: b.completed,
          nextGoal: b.nextGoal,
          status: b.status,
          submittedAt: b.submittedAt,
        }))}
      />
    )
  }

  // 임원/회장/관리자: 팀 현황
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  return (
    <TeamsBriefView
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        lead: t.lead,
        status: t.status,
        submitted: t.submitted,
        risk: t.risk,
        escalation: t.escalation,
      }))}
      canEdit={role === 'executive' || role === 'admin'}
      readOnly={role === 'chairman'}
    />
  )
}
