import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { EscalationManager } from '@/components/dashboard/EscalationManager'

export const dynamic = 'force-dynamic'

export default async function EscalationPage() {
  const session = await auth()

  const [escalations, teams, projectRows] = await Promise.all([
    prisma.escalation.findMany({
      orderBy: { deadline: 'asc' },
      include: {
        decision: { select: { id: true, content: true, decider: true, date: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <EscalationManager
      escalations={escalations.map((e) => ({
        id: e.id,
        item: e.item,
        tier: e.tier,
        dept: e.dept,
        needed: e.needed,
        deadline: e.deadline,
        status: e.status,
        projectId: e.projectId,
        projectName: e.project?.name ?? null,
        decision: e.decision
          ? { content: e.decision.content, decider: e.decision.decider, date: e.decision.date }
          : null,
      }))}
      teams={teams.map((t) => t.name)}
      role={session!.user.role}
      editableTeams={scopeToArray(await editableTeams(session!))}
      projects={projectRows}
    />
  )
}
