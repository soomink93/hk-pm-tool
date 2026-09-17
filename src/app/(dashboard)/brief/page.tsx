import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { TeamsBriefView } from '@/components/dashboard/TeamsBriefView'

export const dynamic = 'force-dynamic'

export default async function BriefPage() {
  const session = await auth()
  if (session!.user.role !== 'admin') notFound()

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
      editableTeams={scopeToArray(await editableTeams(session!))}
    />
  )
}
