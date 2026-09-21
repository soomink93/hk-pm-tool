import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { TaskBoard } from '@/components/dashboard/TaskBoard'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const session = await auth()
  const { role, team } = session!.user

  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const [tasks, teamRows, userRows] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        collaboration: { select: { fromTeam: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.user.findMany({ orderBy: [{ team: 'asc' }, { name: 'asc' }], select: { id: true, name: true, team: true } }),
  ])

  return (
    <TaskBoard
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        team: t.team,
        assignee: t.assignee,
        assigneeId: t.assigneeId,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdByName: t.createdByName,
        collabFrom: t.collaboration?.fromTeam ?? null,
        comments: t.comments.map((m) => ({ id: m.id, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString() })),
      }))}
      myTeam={team ?? ''}
      teams={teamRows.map((t) => t.name)}
      users={userRows.map((u) => ({ id: u.id, name: u.name, team: u.team ?? '' }))}
      role={role}
      currentUserId={session!.user.id}
      editableTeams={scopeToArray(await editableTeams(session!))}
    />
  )
}
