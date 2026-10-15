import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'
import { can } from '@/lib/rbac'

type Hit = { type: string; typeLabel: string; id: string; title: string; subtitle: string; href: string }

const TAKE = 6

export async function GET(req: Request) {
  const g = await guard()
  if (g.res) return g.res

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  if (q.length < 1) return NextResponse.json({ results: [] })

  const { role } = g.session.user
  const like = { contains: q, mode: 'insensitive' as const }
  const results: Hit[] = []

  // 팀 (전 역할)
  const teams = await prisma.team.findMany({
    where: { OR: [{ name: like }, { lead: like }] },
    take: TAKE,
    orderBy: { name: 'asc' },
  })
  for (const t of teams)
    results.push({
      type: 'team',
      typeLabel: '팀',
      id: t.id,
      title: t.name,
      subtitle: `팀장 ${t.lead}${t.department ? ` · ${t.department}` : ''}`,
      href: '/overview',
    })

  // 프로젝트 (전 역할)
  const projects = await prisma.project.findMany({
    where: { OR: [{ name: like }, { ownerName: like }] },
    take: TAKE,
    orderBy: { createdAt: 'desc' },
  })
  for (const p of projects)
    results.push({
      type: 'project',
      typeLabel: '프로젝트',
      id: p.id,
      title: p.name,
      subtitle: `담당 ${p.ownerName || '미지정'}${p.dueDate ? ` · 마감 ${p.dueDate}` : ''}`,
      href: `/projects/${p.id}`,
    })

  // 결정 (열람 권한 있는 역할만)
  if (can(role, 'decision:view')) {
    const decisions = await prisma.decision.findMany({
      where: { OR: [{ content: like }, { decider: like }] },
      take: TAKE,
      orderBy: { date: 'desc' },
    })
    for (const d of decisions)
      results.push({
        type: 'decision',
        typeLabel: '결정',
        id: d.id,
        title: d.content,
        subtitle: `${d.date} · ${d.decider} · ${d.status}`,
        href: '/decisions',
      })
  }

  // 에스컬레이션 (전 역할)
  const escals = await prisma.escalation.findMany({
    where: { OR: [{ item: like }, { dept: like }, { needed: like }] },
    take: TAKE,
    orderBy: { deadline: 'asc' },
  })
  for (const e of escals)
    results.push({
      type: 'escalation',
      typeLabel: '결정 요청',
      id: e.id,
      title: e.item,
      subtitle: `${e.dept} · 기한 ${e.deadline} · ${e.status}`,
      href: '/escalation',
    })

  // 사용자 (관리 권한 있는 역할만)
  if (can(role, 'user:manage')) {
    const users = await prisma.user.findMany({
      where: { OR: [{ name: like }, { email: like }, { team: like }] },
      take: TAKE,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, team: true },
    })
    for (const u of users)
      results.push({
        type: 'user',
        typeLabel: '사용자',
        id: u.id,
        title: u.name,
        subtitle: `${u.email}${u.team ? ` · ${u.team}` : ''}`,
        href: '/settings',
      })
  }

  return NextResponse.json({ results })
}
