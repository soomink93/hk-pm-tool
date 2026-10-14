import Link from 'next/link'
import { Download } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireMe, teamDepts } from '@/lib/orders/session'
import { isSales } from '@/lib/orders/perm'
import { OrdersNav } from '@/components/orders/OrdersNav'
import { Card, StatCard } from '@/components/ui/Card'
import { TypeBadge } from '@/components/orders/badges'
import { byTeam, byType, orderRecord, summarize } from '@/lib/orders/archive'
import { accuracy, monthlyTrend, reasonStats } from '@/lib/orders/stats'
import { FLOWS, FLOW_LABEL, stageDef, type Flow } from '@/lib/orders/stages'

export const dynamic = 'force-dynamic'

// 완료 기록: 완료된 수주의 계획 대비 실적을 쌓아두고 분석·다운로드
export default async function Archive({ searchParams }: { searchParams: Promise<{ type?: string; year?: string }> }) {
  const [me, depts] = await Promise.all([requireMe(), teamDepts()])
  const sp = await searchParams
  const type = sp.type && sp.type in FLOWS ? (sp.type as Flow) : undefined
  const year = /^\d{4}$/.test(sp.year ?? '') ? sp.year! : undefined
  const orders = await prisma.order.findMany({
    where: { status: 'done', ...(type && { productType: type }), ...(year && { completedAt: { startsWith: year } }) },
    include: { stages: { orderBy: { seq: 'asc' } }, logs: { where: { kind: 'change', text: { contains: '사유:' } }, select: { text: true } } },
    orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
  })
  const rows = orders.map((o) => ({ o, r: orderRecord(o, o.stages) }))
  const sum = summarize(rows.map((x) => x.r))
  // 날짜 변경 이력 "[단계명] … 사유:" → 그 단계 담당팀의 변경 횟수
  const changes: Record<string, number> = {}
  // 단계 → 그 수주에서 실제 맡은 팀 (수주마다 담당팀이 다를 수 있음)
  const teamOf = (o: (typeof orders)[number]) => (stage: string) => o.stages.find((s) => s.name === stage)?.team ?? stageDef(stage)?.team ?? ''
  for (const o of orders) for (const l of o.logs) {
    const team = teamOf(o)(l.text.match(/^\[([^\]]+)\]/)?.[1] ?? '')
    if (team) changes[team] = (changes[team] ?? 0) + 1
  }
  const teams = byTeam(rows.map((x) => x.r), changes)
  const types = byType(rows.map((x) => ({ type: x.o.productType, r: x.r })))
  const maxAdded = Math.max(1, ...teams.map((t) => t.addedDelay))
  const worst = teams[0]?.addedDelay ? teams[0] : null
  const trend = monthlyTrend(rows.map((x) => ({ finish: x.r.finish, r: x.r })))
  const maxMonth = Math.max(1, ...trend.map((m) => m.count))
  const reasons = reasonStats(orders.flatMap((o) => o.logs.map((l) => ({ text: l.text, team: teamOf(o) }))))
  const qs = new URLSearchParams({ ...(type && { type }), ...(year && { year }) }).toString()
  const thisYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-navy">완료 기록</h1>
        <OrdersNav active="archive" canCreate={isSales(me, depts)} />
        <form className="no-print ml-auto flex flex-wrap items-center gap-1 text-[12px]">
          <select name="type" defaultValue={type ?? ''} className="rounded border border-line px-2 py-1">
            <option value="">전체 구분</option>
            {(Object.keys(FLOWS) as Flow[]).map((k) => <option key={k} value={k}>{FLOW_LABEL[k]}</option>)}
          </select>
          <select name="year" defaultValue={year ?? ''} className="rounded border border-line px-2 py-1">
            <option value="">전체 기간</option>
            {[0, 1, 2].map((d) => <option key={d}>{thisYear - d}</option>)}
          </select>
          <button className="rounded bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-200">보기</button>
          <a href={`/api/orders/archive?${qs}&kind=orders`} className="inline-flex items-center gap-1 rounded bg-navy-light px-2.5 py-1 font-semibold text-white hover:bg-navy"><Download size={12} />수주별 CSV</a>
          <a href={`/api/orders/archive?${qs}&kind=stages`} className="inline-flex items-center gap-1 rounded bg-navy-light px-2.5 py-1 font-semibold text-white hover:bg-navy"><Download size={12} />단계별 CSV</a>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="완료 수주" value={sum.count} />
        <StatCard title="납기 준수율" value={`${sum.onTimeRate}%`} valueClass={sum.onTimeRate >= 90 ? 'text-green-700' : 'text-red-600'} />
        <StatCard title="평균 리드타임" value={`${sum.avgLead}일`} sub="첫 단계 계획 시작 → 완료" />
        <StatCard title="평균 납기 지연" value={`${sum.avgDelay}일`} sub="지연 건만 반영, 준수는 0" />
      </div>

      <Card className="overflow-x-auto">
        <h2 className="text-sm font-bold text-navy">부서별 병목</h2>
        <p className="mb-3 text-[12px] text-slate-500">
          추가 지연 = 그 부서 단계에서 <b>새로 생긴</b> 지연 일수 (앞 부서에서 밀려온 지연은 제외). 클수록 병목입니다.
        </p>
        {worst && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            가장 큰 병목: <b>{worst.team}</b> — 총 +{worst.addedDelay}일 추가 지연, 단계의 {worst.lateRate}%가 계획보다 늦게 끝남, 평균 {worst.overrun > 0 ? '+' : ''}{worst.overrun}일 초과
          </div>
        )}
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400">
              <th className="py-2">부서</th><th className="w-[34%]">추가 지연(일)</th><th>지연 마감률</th><th>평균 계획 → 실제</th><th>만회(일)</th><th>날짜 변경</th><th>단계 수</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.team} className="border-b border-slate-100">
                <td className="py-1.5 font-semibold">{t.team}</td>
                <td>
                  {/* 단일 계열 막대: 길이 = 추가 지연, 숫자를 옆에 같이 표기(색만으로 구분하지 않음) */}
                  <div className="flex items-center gap-2 pr-6" title={`${t.team}: 추가 지연 ${t.addedDelay}일 / ${t.count}개 단계`}>
                    <div className="h-3 flex-1 rounded-r bg-slate-100">
                      <div className="h-3 rounded-r bg-red-500/80" style={{ width: `${(t.addedDelay / maxAdded) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums text-slate-700">+{t.addedDelay}</span>
                  </div>
                </td>
                <td className={`tabular-nums ${t.lateRate >= 50 ? 'font-semibold text-red-600' : ''}`}>{t.lateRate}%</td>
                <td className="tabular-nums">{t.plan} → <span className={t.actual > t.plan ? 'font-semibold text-red-600' : ''}>{t.actual}일</span></td>
                <td className="tabular-nums text-green-700">{t.recovered ? `-${t.recovered}` : '-'}</td>
                <td className="tabular-nums text-slate-500">{t.changes}회</td>
                <td className="tabular-nums text-slate-500">{t.count}</td>
              </tr>
            ))}
            {!teams.length && <tr><td colSpan={7} className="py-6 text-center text-slate-400">완료된 수주가 없습니다.</td></tr>}
          </tbody>
        </table>
      </Card>

      {types.length > 1 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-2 text-sm font-bold text-navy">제품 구분별</h2>
          <table className="w-full min-w-[480px] text-[13px]">
            <thead><tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400"><th className="py-2">구분</th><th>건수</th><th>납기 준수율</th><th>평균 리드타임</th><th>평균 납기 지연</th></tr></thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.type} className="border-b border-slate-100">
                  <td className="py-1.5"><TypeBadge type={t.type} /></td>
                  <td className="tabular-nums">{t.count}</td>
                  <td className={`tabular-nums ${t.onTimeRate < 90 ? 'font-semibold text-red-600' : 'text-green-700'}`}>{t.onTimeRate}%</td>
                  <td className="tabular-nums">{t.avgLead}일</td>
                  <td className="tabular-nums">{t.avgDelay}일</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <h2 className="mb-2 text-sm font-bold text-navy">월별 추이 (최근 12개월, 완료월 기준)</h2>
          <table className="w-full min-w-[420px] text-[13px]">
            <thead><tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400"><th className="py-2">월</th><th className="w-[40%]">완료</th><th>납기 준수율</th><th>평균 리드타임</th></tr></thead>
            <tbody>
              {trend.map((m) => (
                <tr key={m.month} className="border-b border-slate-100">
                  <td className="py-1 tabular-nums text-slate-500">{m.month}</td>
                  <td>
                    <div className="flex items-center gap-2 pr-4" title={`${m.month}: ${m.count}건 완료`}>
                      <div className="h-2.5 flex-1 rounded-r bg-slate-100"><div className="h-2.5 rounded-r bg-navy-light" style={{ width: `${(m.count / maxMonth) * 100}%` }} /></div>
                      <span className="w-6 text-right tabular-nums">{m.count}</span>
                    </div>
                  </td>
                  <td className={`tabular-nums ${m.onTimeRate === null ? 'text-slate-300' : m.onTimeRate < 90 ? 'font-semibold text-red-600' : 'text-green-700'}`}>{m.onTimeRate === null ? '-' : `${m.onTimeRate}%`}</td>
                  <td className="tabular-nums">{m.avgLead === null ? <span className="text-slate-300">-</span> : `${m.avgLead}일`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-x-auto">
          <h2 className="text-sm font-bold text-navy">날짜 변경 사유 TOP</h2>
          <p className="mb-2 text-[12px] text-slate-500">완료 수주의 날짜 변경 이력 {reasons.reduce((a, r) => a + r.count, 0)}건 기준</p>
          <table className="w-full min-w-[420px] text-[13px]">
            <thead><tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400"><th className="py-2">사유</th><th className="w-[30%]">건수</th><th>많이 겪은 부서</th></tr></thead>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.reason} className="border-b border-slate-100">
                  <td className={`py-1.5 ${r.reason === '기타(미분류)' ? 'text-slate-400' : 'font-semibold'}`}>{r.reason}</td>
                  <td>
                    <div className="flex items-center gap-2 pr-4" title={`${r.reason}: ${r.count}건 (${r.share}%)`}>
                      <div className="h-2.5 flex-1 rounded-r bg-slate-100"><div className="h-2.5 rounded-r bg-amber-500" style={{ width: `${r.share}%` }} /></div>
                      <span className="w-16 whitespace-nowrap text-right tabular-nums">{r.count} ({r.share}%)</span>
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-600">{r.teams.slice(0, 3).map((t) => `${t.team} ${t.n}`).join(' · ')}</td>
                </tr>
              ))}
              {!reasons.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">날짜 변경 이력이 없습니다.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <h2 className="text-sm font-bold text-navy">단계별 계획 정확도 (최초 계획 vs 실제)</h2>
        <p className="mb-2 text-[12px] text-slate-500">정확도 = 실제 ÷ 계획. 100%면 정확, 120% 이상이면 계획을 짧게 잡는 경향 → 자동 배분 기본 일수 조정 검토. 표본 3건 이상일 때 권장값 표시.</p>
        <table className="w-full min-w-[640px] text-[13px]">
          <thead><tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400"><th className="py-2">단계</th><th>건수</th><th>평균 계획</th><th>평균 실제</th><th>정확도</th><th>계획 대비 종료</th><th>자동 배분 기본값</th></tr></thead>
          <tbody>
            {sum.stages.map((s) => {
              const acc = accuracy(s.plan, s.actual)
              const def = stageDef(s.name)
              const suggest = def && acc !== null && s.count >= 3 && Math.abs(acc - 100) > 20 ? Math.max(def.min, Math.round((def.days * acc) / 100)) : null
              return (
                <tr key={s.name} className="border-b border-slate-100">
                  <td className="py-1.5 font-semibold"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: def?.color }} />{s.name}</td>
                  <td className="tabular-nums">{s.count}</td>
                  <td className="tabular-nums">{s.plan}일</td>
                  <td className={`tabular-nums ${s.actual > s.plan ? 'font-semibold text-red-600' : ''}`}>{s.actual}일</td>
                  <td className={`tabular-nums font-semibold ${acc === null ? 'text-slate-300' : acc > 120 ? 'text-red-600' : acc < 80 ? 'text-amber-600' : 'text-green-700'}`}>{acc === null ? '-' : `${acc}%`}</td>
                  <td>{s.slip > 0 ? <span className="badge badge-red">+{s.slip}일</span> : <span className="badge badge-green">{s.slip}일</span>}</td>
                  <td className="text-[12px]">{def ? <>현재 {def.days}일{suggest !== null && suggest !== def.days && <b className="ml-1 text-navy-light">→ {suggest}일 권장</b>}{s.count < 3 && <span className="ml-1 text-slate-400">(표본 부족)</span>}</> : '-'}</td>
                </tr>
              )
            })}
            {!sum.stages.length && <tr><td colSpan={7} className="py-6 text-center text-slate-400">완료된 수주가 없습니다.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-2 text-sm font-bold text-navy">완료 수주 목록</h2>
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] font-bold text-slate-400">
              <th className="py-2">수주번호</th><th>고객사 / 품목</th><th>구분</th><th>시작</th><th>납기</th><th>완료</th><th>리드타임</th><th>납기</th><th>일정 변경</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, r }) => (
              <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 text-slate-500">{o.orderNo || '-'}</td>
                <td><Link href={`/orders/${o.id}`} className="font-semibold text-navy hover:underline">{o.customer} · {o.product}</Link></td>
                <td><TypeBadge type={o.productType} /></td>
                <td>{r.begin}</td><td>{o.dueDate || '-'}</td><td>{r.finish}</td><td>{r.leadDays}일</td>
                <td>{r.delay === null ? '-' : r.delay > 0 ? <span className="badge badge-red">+{r.delay}일</span> : <span className="badge badge-green">준수</span>}</td>
                <td className="text-slate-500">{o.logs.length}회</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
