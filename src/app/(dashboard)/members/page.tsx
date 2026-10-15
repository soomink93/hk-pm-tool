import { prisma } from '@/lib/prisma'
import { MembersDirectory } from '@/components/dashboard/MembersDirectory'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const [users, projects, tasks] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ department: 'asc' }, { team: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true, title: true, team: true, department: true },
    }),
    prisma.project.findMany({ select: { id: true, name: true, ownerId: true } }),
    prisma.task.findMany({ where: { assigneeId: { not: null }, projectId: { not: null } }, select: { assigneeId: true, projectId: true } }),
  ])

  const projName = new Map(projects.map((p) => [p.id, p.name]))
  // 참여 = 프로젝트 담당자(owner)이거나, 그 프로젝트의 작업 담당자
  const byUser = new Map<string, Set<string>>()
  const add = (uid: string, pid: string) => {
    if (!byUser.has(uid)) byUser.set(uid, new Set())
    byUser.get(uid)!.add(pid)
  }
  for (const p of projects) if (p.ownerId) add(p.ownerId, p.id)
  for (const t of tasks) if (t.assigneeId && t.projectId) add(t.assigneeId, t.projectId)

  return (
    <MembersDirectory
      members={users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        title: u.title,
        team: u.team,
        department: u.department,
        projects: [...(byUser.get(u.id) ?? [])].map((pid) => ({ id: pid, name: projName.get(pid) ?? '' })),
      }))}
    />
  )
}
