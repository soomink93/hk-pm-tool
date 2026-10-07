import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderKanban } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { editableTeams, scopeToArray } from '@/lib/scope'
import { can, isFullEditor } from '@/lib/rbac'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TaskBoard } from '@/components/dashboard/TaskBoard'
import { CollaborationManager } from '@/components/dashboard/CollaborationManager'
import { EscalationManager } from '@/components/dashboard/EscalationManager'
import { DecisionsManager } from '@/components/dashboard/DecisionsManager'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; tone: 'green' | 'yellow' | 'gray' }> = {
  active: { label: '진행', tone: 'green' },
  onhold: { label: '보류', tone: 'yellow' },
  done: { label: '완료', tone: 'gray' },
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const { role, team } = session!.user

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) notFound()

  const canViewDecisions = can(role, 'decision:view')
  const taskWhere = role === 'teamlead' ? { team: team ?? '', projectId: id } : { projectId: id }
  const collabWhere =
    role === 'teamlead'
      ? { projectId: id, OR: [{ fromTeam: team ?? '' }, { toTeam: team ?? '' }] }
      : { projectId: id }

  const [tasks, collabs, escalations, decisions, teamRows, userRows, totalTasks, doneTasks, scope] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        collaboration: { select: { fromTeam: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.collaboration.findMany({
      where: collabWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        tasks: { select: { id: true, title: true, status: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.escalation.findMany({
      where: { projectId: id },
      orderBy: { deadline: 'asc' },
      include: { decision: { select: { id: true, content: true, decider: true, date: true } } },
    }),
    canViewDecisions
      ? prisma.decision.findMany({ where: { projectId: id }, orderBy: { date: 'desc' } })
      : Promise.resolve([]),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.user.findMany({ orderBy: [{ team: 'asc' }, { name: 'asc' }], select: { id: true, name: true, team: true } }),
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.count({ where: { projectId: id, status: 'done' } }),
    editableTeams(session!),
  ])

  const editable = scopeToArray(scope)
  const teams = teamRows.map((t) => t.name)
  const users = userRows.map((u) => ({ id: u.id, name: u.name, team: u.team ?? '' }))
  const meta = STATUS_META[project.status] ?? STATUS_META.active
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="mb-2 inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-navy">
          <ArrowLeft size={13} />프로젝트 목록
        </Link>
        <Card className="!p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="flex items-center gap-2 text-lg font-bold text-navy">
              <FolderKanban size={18} className="shrink-0 text-navy-light" />{project.name}
            </h1>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          {project.description && <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-slate-500">{project.description}</p>}
          <div className="mt-2 text-[12px] text-slate-400">
            담당 {project.ownerName || '미지정'}{project.dueDate ? ` · 마감 ${project.dueDate}` : ''}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-navy-light" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>작업 {doneTasks}/{totalTasks}</span><span>{progress}%</span>
          </div>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-navy">작업 보드</h2>
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
            projectId: t.projectId,
            projectName: null,
            comments: t.comments.map((m) => ({ id: m.id, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString() })),
          }))}
          myTeam={team ?? ''}
          teams={teams}
          users={users}
          role={role}
          currentUserId={session!.user.id}
          editableTeams={editable}
          lockProjectId={id}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-navy">협업 요청</h2>
        <CollaborationManager
          items={collabs.map((c) => ({
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
            projectId: c.projectId,
            projectName: null,
            comments: c.comments.map((m) => ({
              id: m.id,
              authorName: m.authorName,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            })),
            tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
          }))}
          myTeam={team ?? ''}
          teams={teams}
          users={users}
          editableTeams={editable}
          lockProjectId={id}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-navy">결정 요청</h2>
        <EscalationManager
          escalations={escalations.map((e) => ({
            id: e.id,
            item: e.item,
            tier: e.tier,
            dept: e.dept,
            needed: e.needed,
            deadline: e.deadline,
            status: e.status,
            projectId: e.projectId,
            projectName: null,
            decision: e.decision
              ? { content: e.decision.content, decider: e.decision.decider, date: e.decision.date }
              : null,
          }))}
          teams={teams}
          role={role}
          editableTeams={editable}
          lockProjectId={id}
        />
      </section>

      {canViewDecisions && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy">결정 로그</h2>
          <DecisionsManager
            decisions={decisions.map((d) => ({
              id: d.id,
              date: d.date,
              content: d.content,
              category: d.category,
              tier: d.tier,
              decider: d.decider,
              priority: d.priority,
              status: d.status,
              createdById: d.createdById,
              fromEscalation: !!d.escalationId,
              projectId: d.projectId,
              projectName: null,
            }))}
            canAdd={can(role, 'decision:write')}
            isFull={isFullEditor(role)}
            currentUserId={session!.user.id}
            lockProjectId={id}
          />
        </section>
      )}
    </div>
  )
}
