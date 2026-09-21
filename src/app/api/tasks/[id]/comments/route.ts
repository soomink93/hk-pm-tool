import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name } = g.session.user
  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  // 팀 편집권자 또는 담당자 본인만 댓글 작성
  const scope = await editableTeams(g.session)
  const allowed = canEditTeam(scope, task.team) || task.assigneeId === userId
  if (!allowed) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const body = String(b.body ?? '').trim()
  if (!body) return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: userId, authorName: name ?? '', body },
  })
  await prisma.task.update({ where: { id }, data: { updatedAt: new Date() } })
  return NextResponse.json(comment, { status: 201 })
}
