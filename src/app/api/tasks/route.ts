import { NextResponse } from 'next/server'
import type { TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { logAudit } from '@/lib/audit'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { role, team } = g.session.user
  const where = role === 'teamlead' ? { team: team ?? '' } : {}
  const items = await prisma.task.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name, role, team } = g.session.user

  const b = await req.json()
  const title = String(b.title ?? '').trim()
  if (!title) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })

  const taskTeam = role === 'teamlead' ? team ?? '' : String(b.team ?? '').trim()
  if (!taskTeam) return NextResponse.json({ error: '담당 팀을 선택하세요.' }, { status: 400 })

  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, taskTeam))
    return NextResponse.json({ error: '해당 팀의 작업을 만들 권한이 없습니다.' }, { status: 403 })

  const status = STATUSES.includes(b.status) ? (b.status as TaskStatus) : 'todo'

  // 담당자: 계정(assigneeId) 우선 — 이름은 계정에서 파생. 계정이 없으면 자유 입력 문자열 유지.
  let assigneeId: string | null = null
  let assignee = String(b.assignee ?? '')
  if (b.assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: String(b.assigneeId) }, select: { id: true, name: true } })
    if (u) {
      assigneeId = u.id
      assignee = u.name
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: String(b.description ?? ''),
      team: taskTeam,
      assignee,
      assigneeId,
      status,
      priority: String(b.priority ?? 'mid'),
      dueDate: String(b.dueDate ?? ''),
      createdById: userId,
      createdByName: name ?? '',
    },
  })
  await logAudit(g.session, 'create', 'task', task.id, `작업 추가: ${task.title} (${taskTeam})`)
  return NextResponse.json(task, { status: 201 })
}
