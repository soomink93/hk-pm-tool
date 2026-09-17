import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { KpiManager } from '@/components/dashboard/KpiManager'

export const dynamic = 'force-dynamic'

export default async function KpiPage() {
  const session = await auth()
  const role = session!.user.role
  const team = session!.user.team

  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const [kpis, teams] = await Promise.all([
    prisma.kpi.findMany({ where, orderBy: { team: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
  ])
  const scope = scopeToArray(await editableTeams(session!))

  return (
    <KpiManager
      kpis={kpis.map((k) => ({
        id: k.id,
        team: k.team,
        metric: k.metric,
        target: k.target,
        current: k.current,
        unit: k.unit,
      }))}
      teams={teams.map((t) => t.name)}
      editableTeams={scope}
    />
  )
}
