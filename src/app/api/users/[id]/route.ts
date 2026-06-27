import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guard } from '@/lib/api-guard'

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
