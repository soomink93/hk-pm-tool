import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const ACTION_LABEL: Record<string, string> = { create: '생성', update: '수정', delete: '삭제', status: '상태변경' }
const ACTION_TONE: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = { create: 'green', update: 'yellow', delete: 'red', status: 'blue' }
const ENTITY_LABEL: Record<string, string> = {
  decision: '결정', escalation: '결정 요청', task: '작업', kpi: 'KPI',
  collaboration: '협업', user: '사용자', team: '팀', brief: '주간보고',
}
const PERIODS = [
  { id: '7d', label: '최근 7일', days: 7 },
  { id: '30d', label: '최근 30일', days: 30 },
  { id: 'all', label: '전체', days: 0 },
]

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await auth()
  if (session!.user.role !== 'admin') notFound()

  const { period = '7d' } = await searchParams
  const sel = PERIODS.find((p) => p.id === period) ?? PERIODS[0]
  const where = sel.days > 0 ? { createdAt: { gte: new Date(Date.now() - sel.days * 86_400_000) } } : {}

  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold text-navy">변경 이력</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/audit?period=${p.id}`}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${p.id === sel.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        {logs.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-line text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3">시간</th>
                  <th className="py-2.5 pr-3">작업자</th>
                  <th className="py-2.5 pr-3">동작</th>
                  <th className="py-2.5 pr-3">대상</th>
                  <th className="py-2.5">내용</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-slate-400">
                      {l.createdAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{l.actorName}</td>
                    <td className="py-2.5 pr-3"><Badge tone={ACTION_TONE[l.action] ?? 'gray'}>{ACTION_LABEL[l.action] ?? l.action}</Badge></td>
                    <td className="py-2.5 pr-3 text-slate-500">{ENTITY_LABEL[l.entity] ?? l.entity}</td>
                    <td className="py-2.5">{l.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
