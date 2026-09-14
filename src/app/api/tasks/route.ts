import { NextResponse } from 'next/server'
import type { TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

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
  if (role === 'chairman') return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const title = String(b.title ?? '').trim()
  if (!title) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })

  const taskTeam = role === 'teamlead' ? team ?? '' : String(b.team ?? '').trim()
  if (!taskTeam) return NextResponse.json({ error: '담당 팀을 선택하세요.' }, { status: 400 })

  const status = STATUSES.includes(b.status) ? (b.status as TaskStatus) : 'todo'

  const task = await prisma.task.create({
    data: {
      title,
      description: String(b.description ?? ''),
      team: taskTeam,
      assignee: String(b.assignee ?? ''),
      status,
      priority: String(b.priority ?? 'mid'),
      dueDate: String(b.dueDate ?? ''),
      createdById: userId,
      createdByName: name ?? '',
    },
  })
  return NextResponse.json(task, { status: 201 })
}
