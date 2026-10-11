import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WorkloadView } from '@/components/dashboard/WorkloadView'

export const dynamic = 'force-dynamic'

const ALLOWED = ['admin', 'chairman', 'president', 'executive']

export default async function WorkloadPage() {
  const session = await auth()
  if (!ALLOWED.includes(session!.user.role)) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  const [users, tasks] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, team: true } }),
    prisma.task.findMany({ where: { assigneeId: { not: null } }, select: { assigneeId: true, status: true, dueDate: true } }),
  ])

  const rows = users.map((u) => {
    const mine = tasks.filter((t) => t.assigneeId === u.id)
    const open = mine.filter((t) => t.status !== 'done')
    return {
      id: u.id,
      name: u.name,
      team: u.team ?? '',
      todo: open.filter((t) => t.status === 'todo').length,
      inprog: open.filter((t) => t.status === 'in_progress').length,
      done: mine.filter((t) => t.status === 'done').length,
      overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
      dueSoon: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= soon).length,
    }
  })

  return <WorkloadView rows={rows} />
}
