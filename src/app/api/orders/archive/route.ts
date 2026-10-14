import { auth } from '@/lib/auth'
import { canSeeOrders } from '@/lib/orders/perm'
import { prisma } from '@/lib/prisma'
import { orderRecord, toCsv } from '@/lib/orders/archive'
import { FLOWS, FLOW_LABEL, type Flow } from '@/lib/orders/stages'

// 완료 기록 CSV (엑셀에서 바로 열림). kind=orders: 수주 1행, kind=stages: 단계 1행(분석용)
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('인증이 필요합니다.', { status: 401 })
  if (!canSeeOrders(session.user.role)) return new Response('Not found', { status: 404 }) // 공개 전에는 관리자만
  const sp = new URL(req.url).searchParams
  const type = sp.get('type') && sp.get('type')! in FLOWS ? (sp.get('type') as Flow) : undefined
  const year = /^\d{4}$/.test(sp.get('year') ?? '') ? sp.get('year')! : undefined
  const kind = sp.get('kind') === 'stages' ? 'stages' : 'orders'

  const orders = await prisma.order.findMany({
    where: { status: 'done', ...(type && { productType: type }), ...(year && { completedAt: { startsWith: year } }) },
    include: { stages: { orderBy: { seq: 'asc' } } },
    orderBy: { completedAt: 'desc' },
  })

  const head = ['수주번호', '고객사', '품목', '수량', '구분', '납기']
  const base = (o: (typeof orders)[number]) => [o.orderNo, o.customer, o.product, o.quantity, FLOW_LABEL[o.productType], o.dueDate]
  const rows: unknown[][] = kind === 'orders'
    ? [
        [...head, '시작', '완료', '리드타임(일)', '납기지연(일)', '납기준수', '특약사항'],
        ...orders.map((o) => {
          const r = orderRecord(o, o.stages)
          return [...base(o), r.begin, r.finish, r.leadDays, r.delay ?? '', r.onTime ? 'Y' : 'N', o.specialTerms]
        }),
      ]
    : [
        [...head, '단계', '담당팀', '계획(일)', '실제(일)', '계획대비 종료(일)', '추가지연(일)', '실제 시작', '실제 종료'],
        ...orders.flatMap((o) => orderRecord(o, o.stages).rows.map((s) => [...base(o), s.name, s.team, s.planDays, s.actualDays, s.slip, s.added, s.actualStart, s.actualEnd])),
      ]

  const name = `완료기록_${kind === 'orders' ? '수주별' : '단계별'}_${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
