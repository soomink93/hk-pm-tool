import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { RoadmapView } from '@/components/dashboard/RoadmapView'

export const dynamic = 'force-dynamic'

export default async function RoadmapPage() {
  await auth()
  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], select: { id: true, name: true, status: true, dueDate: true } }),
    prisma.task.findMany({ where: { projectId: { not: null } }, select: { projectId: true, title: true, status: true, dueDate: true, createdAt: true } }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold text-navy">로드맵</h1>
      <Card>
        <RoadmapView
          projects={projects}
          tasks={tasks.map((t) => ({ projectId: t.projectId, title: t.title, status: t.status, dueDate: t.dueDate, start: t.createdAt.toISOString().slice(0, 10) }))}
        />
      </Card>
    </div>
  )
}
