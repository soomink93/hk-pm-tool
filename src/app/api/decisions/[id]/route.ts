import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { isFullEditor, type Role } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// 임원은 본인이 작성한 결정만 수정/삭제, 전체 편집자는 모두
async function ownOrFull(id: string, session: Session) {
  const decision = await prisma.decision.findUnique({ where: { id } })
  if (!decision) return { decision: null, ok: false }
  const ok = isFullEditor(session.user.role as Role) || decision.createdById === session.user.id
  return { decision, ok }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const { id } = await params
  const { decision, ok } = await ownOrFull(id, g.session)
  if (!decision) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '본인이 작성한 결정만 수정할 수 있습니다.' }, { status: 403 })

  const b = await req.json()
  const updated = await prisma.decision.update({
    where: { id },
    data: {
      date: String(b.date ?? ''),
      content: String(b.content ?? ''),
      tier: String(b.tier ?? ''),
      decider: String(b.decider ?? ''),
      priority: String(b.priority ?? 'mid'),
      status: String(b.status ?? '진행중'),
    },
  })
  await logAudit(g.session, 'update', 'decision', id, `결정 수정: ${updated.content}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('decision:write')
  if (g.res) return g.res
  const { id } = await params
  const { decision, ok } = await ownOrFull(id, g.session)
  if (!decision) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  if (!ok) return NextResponse.json({ error: '본인이 작성한 결정만 삭제할 수 있습니다.' }, { status: 403 })
  await prisma.decision.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'decision', id, `결정 삭제: ${decision.content}`)
  return NextResponse.json({ ok: true })
}
