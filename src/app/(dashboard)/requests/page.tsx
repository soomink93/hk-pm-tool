import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminRequestManager } from '@/components/dashboard/AdminRequestManager'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const session = await auth()
  const { id, role } = session!.user
  const isAdmin = role === 'admin'

  const requests = await prisma.adminRequest.findMany({
    where: isAdmin ? {} : { createdById: id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AdminRequestManager
      requests={requests.map((r) => ({
        id: r.id,
        content: r.content,
        status: r.status,
        reply: r.reply,
        createdByName: r.createdByName,
        createdById: r.createdById,
        createdAt: r.createdAt.toISOString(),
      }))}
      isAdmin={isAdmin}
      currentUserId={id}
    />
  )
}
