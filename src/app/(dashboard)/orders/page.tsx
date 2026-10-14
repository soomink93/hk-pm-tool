import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, StatCard } from '@/components/ui/Card'
import { Gantt, stageBar } from '@/components/orders/Gantt'
import { TypeBadge, DelayBadge } from '@/components/orders/badges'
import { currentStage, delayDays, isLate, today } from '@/lib/orders/stages'
import { currentBottleneck } from '@/lib/orders/stats'
import type { OrderStatus } from '@prisma/client'
import { requireMe, teamDepts } from '@/lib/orders/session'
import { isSales } from '@/lib/orders/perm'
import { OrdersNav } from '@/components/orders/OrdersNav'

export const dynamic = 'force-dynamic'

const FILTERS = { active: '진행', hold: '보류', done: '완료', all: '전체' } as const

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [sp, me, depts] = await Promise.all([searchParams, requireMe(), teamDepts()])
  const filter = (sp.status && sp.status in FILTERS ? sp.status : 'active') as keyof typeof FILTERS
  const orders = await prisma.order.findMany({
    where: filter === 'all' ? {} : { status: filter as OrderStatus },
    include: { stages: { orderBy: { seq: 'asc' } } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  const now = today()
  const month = now.slice(0, 7)
  const rows = orders.map((o) => ({ o, cur: currentStage(o.stages), delay: delayDays(o.dueDate, o.stages) }))
  // 상단 지표·부서별 병목은 필터와 무관하게 항상 '진행' 수주 기준
  const activeOrders = filter === 'active' ? orders : await prisma.order.findMany({ where: { status: 'active' }, include: { stages: { orderBy: { seq: 'asc' } } } })
  const active = activeOrders.map((o) => ({ o, delay: delayDays(o.dueDate, o.stages) }))
  const bottleneck = currentBottleneck(activeOrders, now).filter((b) => b.holding || b.late)
  const maxLate = Math.max(1, ...bottleneck.map((b) => b.lateDays))
  const worst = bottleneck[0]?.lateDays ? bottleneck[0] : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-navy">수주·생산 일정</h1>
        <div className="ml-auto"><OrdersNav active="list" canCreate={isSales(me, depts)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="진행 수주" value={active.length} />
        <StatCard title="납기 지연 예상" value={active.filter((r) => r.delay > 0).length} valueClass="text-red-600" sub="예상 완료일 > 납기" />
        <StatCard title="제품 구분 판정 대기" value={active.filter((r) => r.o.productType === 'undecided').length} valueClass="text-violet-600" sub="설계팀 확인 필요" />
        <StatCard title="이번 달 납기" value={active.filter((r) => r.o.dueDate.startsWith(month)).length} />
      </div>

      <Card className="overflow-x-auto">
        <h2 className="text-sm font-bold text-navy">부서별 현재 병목 (진행 수주)</h2>
        <p className="mb-3 text-[12px] text-slate-500">지금 차례 = 그 부서 단계가 현재 단계인 수주 · 마감 지남 = 종료 예정일이 지났는데 미완료 · 총 지연일 = 마감 지난 단계들의 경과일 합</p>
        {worst && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            지금 가장 막힌 곳: <b>{worst.team}</b> — 마감 지난 단계 {worst.late}개, 총 {worst.lateDays}일 지연
            {worst.oldest && <> · 가장 오래된 건 <Link href={`/orders/${worst.oldest.orderId}`} className="font-semibold underline">{worst.oldest.label} ({worst.oldest.stage} +{worst.oldest.days}일)</Link></>}
          </div>
        )}
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400">
              <th className="py-2">부서</th><th>지금 차례</th><th>진행 중</th><th>마감 지남</th><th className="w-[28%]">총 지연일</th><th>가장 오래된 지연</th>
            </tr>
          </thead>
          <tbody>
            {bottleneck.map((b) => (
              <tr key={b.team} className="border-b border-slate-100">
                <td className="py-1.5 font-semibold">{b.team}</td>
                <td className="tabular-nums">{b.holding}건</td>
                <td className="tabular-nums text-slate-500">{b.doing}</td>
                <td className={`tabular-nums ${b.late ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{b.late}</td>
                <td>
                  <div className="flex items-center gap-2 pr-4" title={`${b.team}: 총 ${b.lateDays}일 지연`}>
                    <div className="h-2.5 flex-1 rounded-r bg-slate-100"><div className="h-2.5 rounded-r bg-red-500/80" style={{ width: `${(b.lateDays / maxLate) * 100}%` }} /></div>
                    <span className="w-10 text-right tabular-nums">{b.lateDays ? `+${b.lateDays}` : '0'}</span>
                  </div>
                </td>
                <td className="text-[12px]">{b.oldest ? <Link href={`/orders/${b.oldest.orderId}`} className="text-navy-light hover:underline">{b.oldest.label} · {b.oldest.stage} +{b.oldest.days}일</Link> : <span className="text-slate-300">-</span>}</td>
              </tr>
            ))}
            {!bottleneck.length && <tr><td colSpan={6} className="py-6 text-center text-slate-400">진행 중인 수주가 없습니다.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-navy">수주별 일정</h2>
          <div className="no-print ml-auto flex gap-1">
            {Object.entries(FILTERS).map(([k, v]) => (
              <Link key={k} href={`/orders?status=${k}`} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${filter === k ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</Link>
            ))}
          </div>
        </div>
        <Gantt
          rows={rows.map(({ o, cur }) => ({
            key: o.id,
            href: `/orders/${o.id}`,
            label: `${o.customer} · ${o.product}`,
            sub: `${o.orderNo || '번호 없음'} · ${cur ? `${cur.name} 단계` : '전 단계 완료'}`,
            due: o.dueDate || undefined,
            bars: o.stages.filter((s) => s.status !== 'skip').map((s) => ({ ...stageBar(s, now), base: undefined })),
          }))}
        />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <th className="py-2">수주번호</th><th>고객사 / 품목</th><th>판정</th><th>현재 단계</th><th>담당</th><th>납기</th><th>지연</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, cur, delay }) => (
              <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 text-slate-500">{o.orderNo || '-'}</td>
                <td><Link href={`/orders/${o.id}`} className="font-semibold text-navy hover:underline">{o.customer} · {o.product}</Link></td>
                <td><TypeBadge type={o.productType} /></td>
                <td className={cur && isLate(cur, now) ? 'font-semibold text-red-600' : ''}>{cur ? `${cur.name} (~${cur.end.slice(5)})` : '완료'}</td>
                <td className="text-slate-500">{cur ? cur.assignee || cur.team : '-'}</td>
                <td>{o.dueDate || '-'}</td>
                <td><DelayBadge days={delay} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="py-8 text-center text-slate-400">수주가 없습니다.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
