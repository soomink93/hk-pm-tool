import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { editableTeams, canEditTeam } from '@/lib/scope'
import { canDecideTier, TIER_DECIDER_LABEL, type Role } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  const esc = await prisma.escalation.findUnique({ where: { id } })
  if (!esc) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const b = await req.json()
  const newDept = String(b.dept ?? esc.dept)
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, esc.dept) || !canEditTeam(scope, newDept))
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const newStatus = String(b.status ?? '대기중')
  const newTier = String(b.tier ?? esc.tier)
  const becameDone = newStatus === '완료' && esc.status !== '완료'

  // 단계별 결정권자 강제: 완료(결정)는 해당 단계 권한자(또는 상위)만
  if (becameDone && !canDecideTier(g.session.user.role as Role, newTier)) {
    return NextResponse.json(
      { error: `${newTier}는 ${TIER_DECIDER_LABEL[newTier] ?? '상위 결정권자'}만 완료(결정)할 수 있습니다.` },
      { status: 403 },
    )
  }

  const updated = await prisma.escalation.update({
    where: { id },
    data: {
      item: String(b.item ?? ''),
      tier: String(b.tier ?? ''),
      dept: newDept,
      needed: String(b.needed ?? ''),
      deadline: String(b.deadline ?? ''),
      status: newStatus,
    },
  })
  await logAudit(g.session, 'update', 'escalation', id, `결정 요청 수정: ${updated.item} (${newStatus})`)

  // 결정 요청 완료 → 결정 로그 자동 생성 + 링크 (중복 방지)
  if (becameDone) {
    const exists = await prisma.decision.findFirst({ where: { escalationId: id } })
    if (!exists) {
      const dec = await prisma.decision.create({
        data: {
          date: new Date().toISOString().slice(0, 10),
          content: `${updated.item} — ${updated.needed}`,
          tier: updated.tier,
          decider: g.session.user.name ?? '',
          priority: 'high',
          status: '완료',
          createdById: g.session.user.id,
          createdByName: g.session.user.name ?? '',
          escalationId: id,
        },
      })
      await logAudit(g.session, 'create', 'decision', dec.id, `결정 요청 완료로 결정 자동 기록: ${updated.item}`)
    }
  }
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('escalation:write')
  if (g.res) return g.res
  const { id } = await params
  const esc = await prisma.escalation.findUnique({ where: { id } })
  if (!esc) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  const scope = await editableTeams(g.session)
  if (!canEditTeam(scope, esc.dept)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  await prisma.escalation.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'escalation', id, `결정 요청 삭제: ${esc.item}`)
  return NextResponse.json({ ok: true })
}
