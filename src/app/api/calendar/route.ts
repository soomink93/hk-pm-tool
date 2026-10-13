import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { canEditCalendar } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const normColor = (c: unknown) => (typeof c === 'string' && HEX_RE.test(c) ? c : '#2E78D2')

// 모든 사용자 열람
export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id, name, email, role } = g.session.user
  if (!canEditCalendar(role, email, name))
    return NextResponse.json({ error: '캘린더 편집 권한이 없습니다.' }, { status: 403 })

  const b = await req.json()
  const date = String(b.date ?? '')
  const title = String(b.title ?? '').trim()
  if (!DATE_RE.test(date)) return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
  if (!title) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  const endDate = b.endDate && DATE_RE.test(String(b.endDate)) && String(b.endDate) > date ? String(b.endDate) : null

  const created = await prisma.calendarEvent.create({
    data: { date, endDate, title, memo: b.memo ? String(b.memo) : null, color: normColor(b.color), createdById: id, createdByName: name ?? '' },
  })
  await logAudit(g.session, 'create', 'calendar', created.id, `일정 추가: ${date} ${title}`)
  return NextResponse.json(created, { status: 201 })
}
