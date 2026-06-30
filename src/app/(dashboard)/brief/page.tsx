import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TeamleadBrief, type Collaboration } from '@/components/dashboard/TeamleadBrief'
import { TeamsBriefView, type CollabRequest } from '@/components/dashboard/TeamsBriefView'

export const dynamic = 'force-dynamic'

const asCollabs = (v: unknown): Collaboration[] => (Array.isArray(v) ? (v as Collaboration[]) : [])

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
        lastCollaborations={last ? asCollabs(last.collaborations) : []}
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

  // 임원/회장: 팀 현황 + 팀별 최신 보고의 협업 요청 집계
  const [teams, briefs] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.brief.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const latestByTeam = new Map<string, (typeof briefs)[number]>()
  for (const b of briefs) if (!latestByTeam.has(b.team)) latestByTeam.set(b.team, b)

  const collabRequests: CollabRequest[] = []
  for (const b of latestByTeam.values()) {
    for (const c of asCollabs(b.collaborations)) {
      collabRequests.push({ from: b.team, to: c.team, content: c.content, status: c.status })
    }
  }

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
      collabRequests={collabRequests}
      canEdit={role === 'executive' || role === 'admin'}
      readOnly={role === 'chairman'}
    />
  )
}
