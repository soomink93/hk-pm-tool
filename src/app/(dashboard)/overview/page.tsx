import { Handshake, KanbanSquare, Clock, TriangleAlert } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { OverviewSummary } from '@/components/dashboard/OverviewSummary'
import { StatTile, ProgressRing, SegmentBar, TrendBars, TeamStatusGrid } from '@/components/dashboard/OverviewVisuals'
import { isUrgent } from '@/lib/helpers'
import { COLLAB_STATE_LABEL, TASK_STATUS_LABEL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const COLLAB_COLOR: Record<string, string> = {
  requested: '#BFBFBF',
  accepted: '#2E75B6',
  in_progress: '#FFC000',
  done: '#70AD47',
  declined: '#C00000',
}
const TASK_COLOR: Record<string, string> = {
  todo: '#BFBFBF',
  in_progress: '#FFC000',
  done: '#70AD47',
}

export default async function OverviewPage() {
  const [collabs, tasks, escalations, teamRows] = await Promise.all([
    prisma.collaboration.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.task.findMany({ orderBy: { dueDate: 'asc' } }),
    prisma.escalation.findMany({ orderBy: { deadline: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { name: true, lead: true, status: true } }),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  // 협업
  const activeStatuses = ['requested', 'accepted', 'in_progress']
  const activeCollabs = collabs.filter((c) => activeStatuses.includes(c.status))
  const collabDist = (['requested', 'accepted', 'in_progress', 'done', 'declined'] as const)
    .map((s) => ({ label: COLLAB_STATE_LABEL[s], value: collabs.filter((c) => c.status === s).length, color: COLLAB_COLOR[s] }))

  // 작업
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < today)
  const attentionTasks = openTasks
    .filter((t) => t.dueDate && t.dueDate <= soon)
    .map((t) => ({ id: t.id, title: t.title, team: t.team, assignee: t.assignee, dueDate: t.dueDate, priority: t.priority, overdue: t.dueDate < today }))
  const taskDist = (['todo', 'in_progress', 'done'] as const)
    .map((s) => ({ label: TASK_STATUS_LABEL[s], value: tasks.filter((t) => t.status === s).length, color: TASK_COLOR[s] }))

  // 최근 7일 vs 지난 7일 추세
  const d7 = new Date(Date.now() - 7 * 86_400_000)
  const d14 = new Date(Date.now() - 14 * 86_400_000)
  const [nc7, ncp, dt7, dtp, ne7, nep] = await Promise.all([
    prisma.collaboration.count({ where: { createdAt: { gte: d7 } } }),
    prisma.collaboration.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
    prisma.task.count({ where: { status: 'done', updatedAt: { gte: d7 } } }),
    prisma.task.count({ where: { status: 'done', updatedAt: { gte: d14, lt: d7 } } }),
    prisma.escalation.count({ where: { createdAt: { gte: d7 } } }),
    prisma.escalation.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
  ])
  const trend = [
    { label: '신규 협업', now: nc7, prev: ncp, color: '#2E75B6' },
    { label: '완료 작업', now: dt7, prev: dtp, color: '#2E8540' },
    { label: '신규 결정 요청', now: ne7, prev: nep, color: '#C00000' },
  ]

  // 결정 요청
  const openEscal = escalations.filter((e) => e.status !== '완료')
  const urgentEscal = openEscal.filter((e) => isUrgent(e.deadline))
  const pendingEscalations = openEscal.map((e) => ({
    id: e.id, item: e.item, dept: e.dept, needed: e.needed, deadline: e.deadline, status: e.status, urgent: isUrgent(e.deadline),
  }))

  return (
    <div className="space-y-4">
      <OverviewSummary
        counts={{
          collabActive: activeCollabs.length,
          tasksOpen: openTasks.length,
          tasksOverdue: overdueTasks.length,
          escalOpen: openEscal.length,
          escalUrgent: urgentEscal.length,
        }}
        activeCollabs={activeCollabs.map((c) => ({ id: c.id, fromTeam: c.fromTeam, toTeam: c.toTeam, content: c.content, status: c.status }))}
        attentionTasks={attentionTasks}
        pendingEscalations={pendingEscalations}
      />

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile icon={Handshake} title="진행 중 협업" value={activeCollabs.length} sub="요청·수락·진행" accent="#2E75B6" delta={nc7 - ncp} />
        <StatTile icon={KanbanSquare} title="미완료 작업" value={openTasks.length} sub="할 일 + 진행 중" accent="#B7791F" />
        <StatTile icon={Clock} title="지연 작업" value={overdueTasks.length} sub="마감 초과" accent="#E36C09" />
        <StatTile icon={TriangleAlert} title="오픈 결정 요청" value={openEscal.length} sub={`긴급 ${urgentEscal.length}`} accent="#C00000" delta={ne7 - nep} />
      </div>

      {/* 작업 진행률 + 협업 상태 */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-base font-bold text-navy">작업 진행률</h2>
          <div className="flex items-center gap-5">
            <ProgressRing value={doneTasks.length} total={tasks.length} color="#2E8540" label="완료율" />
            <div className="flex-1">
              <SegmentBar segments={taskDist} />
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-bold text-navy">협업 상태 분포</h2>
          <SegmentBar segments={collabDist} />
        </Card>
      </div>

      {/* 7일 추세 */}
      <Card>
        <h2 className="mb-3 text-base font-bold text-navy">최근 7일 활동 <span className="text-xs font-normal text-slate-400">(지난 7일 대비)</span></h2>
        <TrendBars items={trend} />
      </Card>

      {/* 팀 상태 */}
      <Card>
        <h2 className="mb-3 text-base font-bold text-navy">팀 상태</h2>
        <TeamStatusGrid teams={teamRows} />
      </Card>

      {/* 오픈 결정 요청 */}
      <Card>
        <h2 className="mb-4 text-base font-bold text-navy">오픈 결정 요청 <span className="text-xs font-normal text-slate-400">({openEscal.length})</span></h2>
        {openEscal.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3">항목</th>
                  <th className="py-2.5 pr-3">요청 부서</th>
                  <th className="py-2.5 pr-3">필요 결정</th>
                  <th className="py-2.5 pr-3">기한</th>
                  <th className="py-2.5">상태</th>
                </tr>
              </thead>
              <tbody>
                {openEscal.map((e) => {
                  const urgent = isUrgent(e.deadline)
                  return (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-3 font-semibold">{e.item}</td>
                      <td className="py-2.5 pr-3">{e.dept}</td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500">{e.needed}</td>
                      <td className="py-2.5 pr-3" style={{ color: urgent ? '#C00000' : undefined, fontWeight: urgent ? 700 : 400 }}>
                        {e.deadline}{urgent && ' (임박)'}
                      </td>
                      <td className="py-2.5">
                        <Badge tone={e.status === '검토중' ? 'yellow' : 'red'}>{e.status}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-slate-400">오픈 결정 요청 없음</p>
        )}
      </Card>
    </div>
  )
}
