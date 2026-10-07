import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/lib/rbac'
import { ProjectsManager } from '@/components/dashboard/ProjectsManager'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const session = await auth()
  const role = session!.user.role as Role
  const userId = session!.user.id

  const [projects, tasks, users, teams] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ where: { projectId: { not: null } }, select: { projectId: true, team: true, status: true } }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
  ])

  const rows = projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id)
    const teamSet = [...new Set(pt.map((t) => t.team))]
    return {
      id: p.id, name: p.name, description: p.description, status: p.status, ownerId: p.ownerId, ownerName: p.ownerName,
      dueDate: p.dueDate, taskTotal: pt.length, taskDone: pt.filter((t) => t.status === 'done').length, teams: teamSet,
    }
  })

  return (
    <ProjectsManager
      projects={rows}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      allTeams={teams.map((t) => t.name)}
      role={role}
      userId={userId}
    />
  )
}
