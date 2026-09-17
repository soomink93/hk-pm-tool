import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { EscalationManager } from '@/components/dashboard/EscalationManager'

export const dynamic = 'force-dynamic'

export default async function EscalationPage() {
  const session = await auth()

  const [escalations, teams] = await Promise.all([
    prisma.escalation.findMany({ orderBy: { deadline: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
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
      }))}
      teams={teams.map((t) => t.name)}
      editableTeams={scopeToArray(await editableTeams(session!))}
    />
  )
}
