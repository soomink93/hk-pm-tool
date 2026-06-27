import { prisma } from '@/lib/prisma'
import { Card, StatCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { OverviewChart } from '@/components/dashboard/OverviewChart'
import { isUrgent, STATUS_COLOR } from '@/lib/helpers'
import { STATUS_LABEL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [teams, escalations, decisions] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.escalation.findMany(),
    prisma.decision.findMany(),
  ])

  const submitted = teams.filter((t) => t.submitted).length
  const green = teams.filter((t) => t.status === 'green').length
  const openEscal = escalations.filter((e) => e.status !== '완료')
  const weekAgo = Date.now() - 7 * 86_400_000
  const recentDecisions = decisions.filter(
    (d) => d.status === '완료' && new Date(d.date).getTime() >= weekAgo,
  ).length

  const statusCounts = (['green', 'yellow', 'red', 'gray'] as const).map((s) => ({
    label: STATUS_LABEL[s],
    value: teams.filter((t) => t.status === s).length,
    color: STATUS_COLOR[s],
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard title="보고 제출률" value={`${submitted}/${teams.length}`} sub="이번 주 팀장 보고" />
        <StatCard title="정상 진행 팀" value={green} sub="전체 팀 중" valueClass="text-[#70AD47]" />
        <StatCard title="오픈 에스컬레이션" value={openEscal.length} sub="결정 대기 중" valueClass="text-[#C00000]" />
        <StatCard title="이번 주 결정 완료" value={recentDecisions} sub="결정 로그 기준" valueClass="text-navy-light" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-bold text-navy">팀별 상태 분포</h2>
          <OverviewChart data={statusCounts} />
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-bold text-navy">오픈 에스컬레이션</h2>
          {openEscal.length ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5">항목</th>
                  <th className="py-2.5">부서</th>
                  <th className="py-2.5">기한</th>
                </tr>
              </thead>
              <tbody>
                {openEscal.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-semibold">{e.item}</td>
                    <td className="py-2.5">{e.dept}</td>
                    <td className="py-2.5" style={{ color: isUrgent(e.deadline) ? '#C00000' : undefined }}>
                      {e.deadline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-[13px] text-slate-400">오픈 에스컬레이션 없음</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-base font-bold text-navy">팀별 상태</h2>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="py-2.5">팀명</th>
              <th className="py-2.5">팀장</th>
              <th className="py-2.5">상태</th>
              <th className="py-2.5">지연 / 리스크</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const hasRisk = !!t.risk && t.risk !== '없음' && t.risk !== '—'
              return (
                <tr key={t.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-semibold">{t.name}</td>
                  <td className="py-2.5">{t.lead}</td>
                  <td className="py-2.5">
                    <StatusBadge status={t.status as keyof typeof STATUS_LABEL} />
                  </td>
                  <td className="max-w-[280px] truncate py-2.5 text-xs" style={{ color: hasRisk ? '#E36C09' : '#94a3b8' }} title={hasRisk ? t.risk : undefined}>
                    {hasRisk ? t.risk : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
