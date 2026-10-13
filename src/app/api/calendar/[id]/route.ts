import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { canEditCalendar } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { name, email, role } = g.session.user
  if (!canEditCalendar(role, email, name))
    return NextResponse.json({ error: '캘린더 편집 권한이 없습니다.' }, { status: 403 })
  const { id } = await params
  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

  const b = await req.json()
  const date = b.date !== undefined ? String(b.date) : existing.date
  const title = b.title !== undefined ? String(b.title).trim() : existing.title
  if (!DATE_RE.test(date)) return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
  if (!title) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })

  const color = typeof b.color === 'string' && HEX_RE.test(b.color) ? b.color : existing.color
  const endDate =
    b.endDate === undefined ? existing.endDate
    : b.endDate && DATE_RE.test(String(b.endDate)) && String(b.endDate) > date ? String(b.endDate)
    : null
  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: { date, endDate, title, memo: b.memo !== undefined ? (b.memo ? String(b.memo) : null) : existing.memo, color },
  })
  await logAudit(g.session, 'update', 'calendar', id, `일정 수정: ${date} ${title}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (g.res) return g.res
  const { name, email, role } = g.session.user
  if (!canEditCalendar(role, email, name))
    return NextResponse.json({ error: '캘린더 편집 권한이 없습니다.' }, { status: 403 })
  const { id } = await params
  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  await prisma.calendarEvent.delete({ where: { id } })
  await logAudit(g.session, 'delete', 'calendar', id, `일정 삭제: ${existing.date} ${existing.title}`)
  return NextResponse.json({ ok: true })
}
