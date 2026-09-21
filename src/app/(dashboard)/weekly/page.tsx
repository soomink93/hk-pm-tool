import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { buildWeeklyDigest } from '@/lib/digest'
import { mailConfigured } from '@/lib/mailer'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SendWeeklyButton } from '@/components/dashboard/SendWeeklyButton'

export const dynamic = 'force-dynamic'

const ALLOWED = ['admin', 'chairman', 'president']

export default async function WeeklyPage() {
  const session = await auth()
  const role = session!.user.role
  if (!ALLOWED.includes(role)) notFound()

  const d = await buildWeeklyDigest()
  const isAdmin = role === 'admin'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-navy">주간 경영 요약</h1>
          <p className="text-[12px] text-slate-400">{d.rangeLabel} · 회장·사장·관리자 대상</p>
        </div>
        {isAdmin && <SendWeeklyButton configured={mailConfigured()} />}
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard title="신규 결정" value={d.decisions.total} sub="지난 7일" valueClass="text-navy-light" />
        <StatCard title="신규 결정요청" value={d.escalations.newCount} sub={`완료 ${d.escalations.resolvedCount}`} />
        <StatCard title="완료 작업" value={d.tasks.doneCount} sub="지난 7일" valueClass="text-[#548235]" />
        <StatCard title="지연 작업" value={d.tasks.overdue.length} sub="마감 초과" valueClass="text-[#C00000]" />
      </div>

      <Card>
        <h2 className="mb-3 text-base font-bold text-navy">
          오픈 결정 요청 <span className="text-xs font-normal text-slate-400">({d.escalations.open.length}건 · 지난주 완료 {d.escalations.resolvedCount})</span>
        </h2>
        {d.escalations.open.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3">항목</th><th className="py-2.5 pr-3">부서</th><th className="py-2.5 pr-3">단계</th><th className="py-2.5">기한</th>
                </tr>
              </thead>
              <tbody>
                {d.escalations.open.slice(0, 15).map((e, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{e.item}</td>
                    <td className="py-2 pr-3 text-slate-500">{e.dept}</td>
                    <td className="py-2 pr-3"><Badge tone="blue">{e.tier}</Badge></td>
                    <td className="py-2" style={{ color: e.urgent ? '#C00000' : undefined, fontWeight: e.urgent ? 700 : 400 }}>{e.deadline || '-'}{e.urgent && ' (임박)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-4 text-center text-[13px] text-slate-400">오픈 결정 요청 없음</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-navy">지연 작업 <span className="text-xs font-normal text-slate-400">({d.tasks.overdue.length}건)</span></h2>
        {d.tasks.overdue.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3">작업</th><th className="py-2.5 pr-3">팀</th><th className="py-2.5 pr-3">담당</th><th className="py-2.5">마감</th>
                </tr>
              </thead>
              <tbody>
                {d.tasks.overdue.slice(0, 15).map((t, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{t.title}</td>
                    <td className="py-2 pr-3 text-slate-500">{t.team}</td>
                    <td className="py-2 pr-3 text-slate-500">{t.assignee}</td>
                    <td className="py-2 font-bold text-[#C00000]">{t.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-4 text-center text-[13px] text-slate-400">지연 작업 없음</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-navy">지난주 결정 <span className="text-xs font-normal text-slate-400">({d.decisions.total}건)</span></h2>
        {d.decisions.byCategory.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {d.decisions.byCategory.map((c) => (
              <span key={c.category} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{c.category} {c.count}</span>
            ))}
          </div>
        )}
        {d.decisions.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3">날짜</th><th className="py-2.5 pr-3">분류</th><th className="py-2.5 pr-3">내용</th><th className="py-2.5">결정자</th>
                </tr>
              </thead>
              <tbody>
                {d.decisions.items.map((x, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 text-xs text-slate-400">{x.date}</td>
                    <td className="py-2 pr-3"><Badge tone="gray">{x.category}</Badge></td>
                    <td className="py-2 pr-3 font-semibold">{x.content}</td>
                    <td className="py-2 text-slate-500">{x.decider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-4 text-center text-[13px] text-slate-400">지난주 신규 결정 없음</p>}
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-bold text-navy">협업</h2>
        <p className="text-[13px] text-slate-600">
          신규 <b className="text-navy">{d.collaborations.newCount}</b>건 · 완료 <b className="text-[#548235]">{d.collaborations.doneCount}</b>건 · 진행 중 <b className="text-navy">{d.collaborations.pending}</b>건
        </p>
      </Card>
    </div>
  )
}
