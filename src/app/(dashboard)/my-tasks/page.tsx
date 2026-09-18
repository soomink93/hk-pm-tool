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
    include: { collaboration: { select: { fromTeam: true } } },
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
      }))}
    />
  )
}
