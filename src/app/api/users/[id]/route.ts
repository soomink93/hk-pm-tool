import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import type { Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

const ROLES = ['admin', 'chairman', 'president', 'executive', 'teamlead']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })

  const b = await req.json()

  // 비밀번호 초기화 (규칙: !이메일ID@) + 첫 로그인 변경 강제
  if (b.resetPassword) {
    const newPw = `!${user.email.split('@')[0]}@`
    await prisma.user.update({ where: { id }, data: { passwordHash: bcrypt.hashSync(newPw, 10), mustChangePassword: true } })
    return NextResponse.json({ ok: true, password: newPw })
  }

  const data: Prisma.UserUpdateInput = {}
  if (b.name !== undefined) data.name = String(b.name)
  if (b.team !== undefined) data.team = String(b.team) || null
  if (b.department !== undefined) data.department = String(b.department) || null
  if (b.role !== undefined) {
    if (!ROLES.includes(String(b.role))) return NextResponse.json({ error: '역할이 올바르지 않습니다.' }, { status: 400 })
    data.role = b.role as Role
  }
  if (b.password) {
    data.passwordHash = bcrypt.hashSync(String(b.password), 10)
    data.mustChangePassword = true
  }
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, team: true, department: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard('user:manage')
  if (g.res) return g.res
  const { id } = await params
  if (id === g.session.user.id) {
    return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
