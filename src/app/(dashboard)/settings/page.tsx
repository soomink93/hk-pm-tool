import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { SettingsManager } from '@/components/dashboard/SettingsManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  const role = session!.user.role
  const canManage = can(role, 'user:manage')

  const [users, teams] = await Promise.all([
    canManage
      ? prisma.user.findMany({
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, email: true, role: true, team: true },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, lead: true, status: true } })
      : Promise.resolve([]),
  ])

  return (
    <SettingsManager
      users={users}
      teams={teams}
      currentUserId={session!.user.id}
      canManage={canManage}
    />
  )
}
