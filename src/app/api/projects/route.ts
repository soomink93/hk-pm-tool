import { NextResponse } from 'next/server'
import type { ProjectStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { logAudit } from '@/lib/audit'

const STATUSES: ProjectStatus[] = ['active', 'onhold', 'done']

export async function GET() {
  const g = await guard()
  if (g.res) return g.res
  const items = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const { id: userId, name } = g.session.user
  const b = await req.json()
  const projName = String(b.name ?? '').trim()
  if (!projName) return NextResponse.json({ error: '프로젝트 이름을 입력하세요.' }, { status: 400 })

  let ownerId: string | null = null
  let ownerName = ''
  if (b.ownerId) {
    const u = await prisma.user.findUnique({ where: { id: String(b.ownerId) }, select: { id: true, name: true } })
    if (u) { ownerId = u.id; ownerName = u.name }
  }
  // 소유자 미지정 시 생성자가 기본 소유자 (편집 권한 유지)
  if (!ownerId) { ownerId = userId; ownerName = name ?? '' }
  const status = STATUSES.includes(b.status) ? (b.status as ProjectStatus) : 'active'

  const project = await prisma.project.create({
    data: {
      name: projName,
      description: String(b.description ?? ''),
      status,
      ownerId,
      ownerName,
      dueDate: b.dueDate ? String(b.dueDate) : '',
      createdById: userId,
      createdByName: name ?? '',
    },
  })
  await logAudit(g.session, 'create', 'project', project.id, `프로젝트 생성: ${project.name}`)
  return NextResponse.json(project, { status: 201 })
}
