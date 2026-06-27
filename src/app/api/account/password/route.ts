import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

export async function POST(req: Request) {
  const g = await guard()
  if (g.res) return g.res
  const b = await req.json()
  const current = String(b.current ?? '')
  const next = String(b.next ?? '')

  if (!next) return NextResponse.json({ error: '새 비밀번호를 입력하세요.' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: g.session.user.id } })
  if (!user || !bcrypt.compareSync(current, user.passwordHash)) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(next, 10) },
  })
  return NextResponse.json({ ok: true })
}
