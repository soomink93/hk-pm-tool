import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { notifyAdminRequest } from '@/lib/notify'
import { logAudit } from '@/lib/audit'

// 관리자는 전체, 그 외는 본인 요청만
export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const { id, role } = g.session.user
  const requests = await prisma.adminRequest.findMany({
    where: role === 'admin' ? {} : { createdById: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id, name } = g.session.user
  const content = String((await req.json()).content ?? '').trim()
  if (!content) return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })

  const created = await prisma.adminRequest.create({
    data: { content, createdById: id, createdByName: name ?? '' },
  })
  await logAudit(g.session, 'create', 'admin_request', created.id, `관리자 요청: ${content.slice(0, 40)}`)
  await notifyAdminRequest({ content, byName: name ?? '' }, id)
  return NextResponse.json(created, { status: 201 })
}
