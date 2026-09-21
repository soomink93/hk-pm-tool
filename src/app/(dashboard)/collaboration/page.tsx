import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { CollaborationManager } from '@/components/dashboard/CollaborationManager'

export const dynamic = 'force-dynamic'

export default async function CollaborationPage() {
  const session = await auth()
  const { role, team } = session!.user

  const where =
    role === 'teamlead' ? { OR: [{ fromTeam: team ?? '' }, { toTeam: team ?? '' }] } : {}

  const [items, teamRows, userRows] = await Promise.all([
    prisma.collaboration.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        tasks: { select: { id: true, title: true, status: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.user.findMany({ orderBy: [{ team: 'asc' }, { name: 'asc' }], select: { id: true, name: true, team: true } }),
  ])

  return (
    <CollaborationManager
      items={items.map((c) => ({
        id: c.id,
        fromTeam: c.fromTeam,
        toTeam: c.toTeam,
        content: c.content,
        status: c.status,
        priority: c.priority,
        dueDate: c.dueDate,
        createdByName: c.createdByName,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        comments: c.comments.map((m) => ({
          id: m.id,
          authorName: m.authorName,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
        tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      }))}
      myTeam={team ?? ''}
      teams={teamRows.map((t) => t.name)}
      users={userRows.map((u) => ({ id: u.id, name: u.name, team: u.team ?? '' }))}
      editableTeams={scopeToArray(await editableTeams(session!))}
    />
  )
}
