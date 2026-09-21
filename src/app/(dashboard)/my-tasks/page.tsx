import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MyTasks } from '@/components/dashboard/MyTasks'

export const dynamic = 'force-dynamic'

export default async function MyTasksPage() {
  const session = await auth()
  const userId = session!.user.id

  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      collaboration: { select: { fromTeam: true } },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })

  return (
    <MyTasks
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        team: t.team,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        collabFrom: t.collaboration?.fromTeam ?? null,
        comments: t.comments.map((m) => ({ id: m.id, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString() })),
      }))}
    />
  )
}
