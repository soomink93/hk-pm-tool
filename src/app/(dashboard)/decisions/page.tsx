import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can, isFullEditor } from '@/lib/rbac'
import { DecisionsManager } from '@/components/dashboard/DecisionsManager'

export const dynamic = 'force-dynamic'

export default async function DecisionsPage() {
  const session = await auth()
  const role = session!.user.role
  if (!can(role, 'decision:view')) notFound()

  const [decisions, projectRows] = await Promise.all([
    prisma.decision.findMany({ orderBy: { date: 'desc' }, include: { project: { select: { name: true } } } }),
    prisma.project.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <DecisionsManager
      decisions={decisions.map((d) => ({
        id: d.id,
        date: d.date,
        content: d.content,
        category: d.category,
        tier: d.tier,
        decider: d.decider,
        priority: d.priority,
        status: d.status,
        createdById: d.createdById,
        fromEscalation: !!d.escalationId,
        projectId: d.projectId,
        projectName: d.project?.name ?? null,
      }))}
      canAdd={can(role, 'decision:write')}
      isFull={isFullEditor(role)}
      currentUserId={session!.user.id}
      projects={projectRows}
    />
  )
}
