import { Card, StatCard } from '@/components/ui/Card'

export type WorkloadRow = {
  id: string; name: string; team: string
  todo: number; inprog: number; done: number; overdue: number; dueSoon: number
}

const OVERLOAD = 5 // 미완료 5건 이상 = 과부하

export function WorkloadView({ rows }: { rows: WorkloadRow[] }) {
  const ranked = rows
    .map((r) => ({ ...r, open: r.todo + r.inprog }))
    .filter((r) => r.open > 0 || r.done > 0)
    .sort((a, b) => b.open - a.open)
  const maxOpen = Math.max(1, ...ranked.map((r) => r.open))
  const totalOpen = ranked.reduce((s, r) => s + r.open, 0)
  const overloaded = ranked.filter((r) => r.open >= OVERLOAD).length
  const withOverdue = ranked.filter((r) => r.overdue > 0).length

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold text-navy">담당자별 업무량</h1>

      <div className="grid grid-cols-3 gap-3.5">
        <StatCard title="전체 미완료" value={totalOpen} sub="할 일 + 진행 중" />
        <StatCard title="과부하 인원" value={overloaded} sub={`미완료 ${OVERLOAD}건 이상`} valueClass="text-[#E36C09]" />
        <StatCard title="지연 보유" value={withOverdue} sub="마감 초과 보유" valueClass="text-[#C00000]" />
      </div>

      <Card>
        {ranked.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">배정된 작업이 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {ranked.map((r) => {
              const overload = r.open >= OVERLOAD
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <div className="truncate text-[13px] font-semibold text-navy" title={r.name}>{r.name}</div>
                    <div className="truncate text-[10px] text-slate-400">{r.team || '-'}</div>
                  </div>
                  <div className="flex h-6 flex-1 items-center">
                    <div className="flex h-5 overflow-hidden rounded" style={{ width: `${(r.open / maxOpen) * 100}%`, minWidth: r.open ? 10 : 0 }}>
                      {r.inprog > 0 && <div style={{ flex: r.inprog, background: '#E0A106' }} title={`진행 중 ${r.inprog}`} />}
                      {r.todo > 0 && <div style={{ flex: r.todo, background: '#CBD5E1' }} title={`할 일 ${r.todo}`} />}
                    </div>
                    <span className={`ml-2 text-[12px] font-bold ${overload ? 'text-[#E36C09]' : 'text-navy'}`}>{r.open}</span>
                  </div>
                  <div className="flex w-28 shrink-0 justify-end gap-1">
                    {r.overdue > 0 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#C00000]">지연 {r.overdue}</span>}
                    {r.dueSoon > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-[#B7791F]">임박 {r.dueSoon}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 border-t border-slate-50 pt-3 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#E0A106' }} />진행 중</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: '#CBD5E1' }} />할 일</span>
          <span className="ml-auto">막대 길이 = 미완료 작업 수</span>
        </div>
      </Card>
    </div>
  )
}
