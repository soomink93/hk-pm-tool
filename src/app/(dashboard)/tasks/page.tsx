import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskBoard } from '@/components/dashboard/TaskBoard'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const session = await auth()
  const { role, team } = session!.user

  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const [tasks, teamRows] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { collaboration: { select: { fromTeam: true } } },
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
  ])

  return (
    <TaskBoard
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        team: t.team,
        assignee: t.assignee,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdByName: t.createdByName,
        collabFrom: t.collaboration?.fromTeam ?? null,
      }))}
      myTeam={team ?? ''}
      teams={teamRows.map((t) => t.name)}
      role={role}
    />
  )
}
