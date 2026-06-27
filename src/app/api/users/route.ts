import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

const ROLES = ['chairman', 'executive', 'teamlead']

export async function GET() {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, team: true },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const b = await req.json()
  const email = String(b.email ?? '').trim().toLowerCase()
  const name = String(b.name ?? '').trim()
  const role = String(b.role ?? '')
  const password = String(b.password ?? '')

  if (!email || !name || !password) return NextResponse.json({ error: '이메일·이름·비밀번호는 필수입니다.' }, { status: 400 })
  if (!ROLES.includes(role)) return NextResponse.json({ error: '역할이 올바르지 않습니다.' }, { status: 400 })
  if (await prisma.user.findUnique({ where: { email } }))
    return NextResponse.json({ error: '이미 존재하는 이메일입니다.' }, { status: 409 })

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: role as Role,
      team: String(b.team ?? '') || null,
      passwordHash: bcrypt.hashSync(password, 10),
    },
    select: { id: true, name: true, email: true, role: true, team: true },
  })
  return NextResponse.json(user, { status: 201 })
}
