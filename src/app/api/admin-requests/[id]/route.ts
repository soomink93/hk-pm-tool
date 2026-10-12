import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { notifyAdminRequestHandled } from '@/lib/notify'
import { logAudit } from '@/lib/audit'

// 관리자: 상태·답변 처리. (상태 변경은 관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  if (g.session.user.role !== 'admin')
    return NextResponse.json({ error: '관리자만 처리할 수 있습니다.' }, { status: 403 })
  const { id } = await params
  const existing = await prisma.adminRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const b = await req.json()
  const status = b.status === '처리완료' ? '처리완료' : '대기중'
  const reply = b.reply !== undefined ? String(b.reply) : existing.reply
  const updated = await prisma.adminRequest.update({ where: { id }, data: { status, reply } })
  await logAudit(g.session, 'status', 'admin_request', id, `관리자 요청 ${status}`)

  // 대기중 → 처리완료로 바뀐 순간에만 작성자에게 알림
  if (status === '처리완료' && existing.status !== '처리완료')
    await notifyAdminRequestHandled({ requesterId: updated.createdById, content: updated.content, reply: updated.reply ?? undefined }, g.session.user.id)
  return NextResponse.json(updated)
}

// 작성자(대기중일 때) 또는 관리자만 삭제
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, role } = g.session.user
  const { id } = await params
  const existing = await prisma.adminRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const isOwnerPending = existing.createdById === userId && existing.status === '대기중'
  if (role !== 'admin' && !isOwnerPending)
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  await prisma.adminRequest.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'admin_request', id, `관리자 요청 삭제`)
  return NextResponse.json({ ok: true })
}
