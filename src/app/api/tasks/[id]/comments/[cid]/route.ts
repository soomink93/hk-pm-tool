import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { isFullEditor, type Role } from '@/lib/rbac'
import { notifyMentions } from '@/lib/notify'

// 본인 댓글(또는 전체 편집자)만 수정/삭제
async function ownOrFull(cid: string, userId: string, role: Role) {
  const c = await prisma.taskComment.findUnique({ where: { id: cid } })
  if (!c) return { c: null, ok: false }
  return { c, ok: c.authorId === userId || isFullEditor(role) }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id, cid } = await params
  const { c, ok } = await ownOrFull(cid, g.session.user.id, g.session.user.role as Role)
  if (!c || c.taskId !== id) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '본인 댓글만 수정할 수 있습니다.' }, { status: 403 })
  const body = String((await req.json()).body ?? '').trim()
  if (!body) return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })
  const updated = await prisma.taskComment.update({ where: { id: cid }, data: { body } })
  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } })
  await notifyMentions(body, '/tasks', `작업 댓글 · ${task?.title ?? ''}`, g.session.user.id, g.session.user.name ?? undefined)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id, cid } = await params
  const { c, ok } = await ownOrFull(cid, g.session.user.id, g.session.user.role as Role)
  if (!c || c.taskId !== id) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '본인 댓글만 삭제할 수 있습니다.' }, { status: 403 })
  await prisma.taskComment.delete({ where: { id: cid } })
  return NextResponse.json({ ok: true })
}
