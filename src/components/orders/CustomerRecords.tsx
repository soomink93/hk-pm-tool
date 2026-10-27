import Link from 'next/link'
import { Building } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const kst = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(2, 16).replace('T', ' ')
const STATUS = { active: '진행', hold: '보류', done: '완료' } as const

type Note = { id: string; text: string; actor: string; createdAt: Date }
type OtherOrder = { id: string; product: string; orderNo: string; status: keyof typeof STATUS }

// 고객사 공용 기록 + 같은 고객사의 다른 수주 (수주 상세 화면용)
export function CustomerRecords({ customer, notes, others, action }: { customer: string; notes: Note[]; others: OtherOrder[]; action: (f: FormData) => Promise<void> }) {
  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-1 text-sm font-bold text-navy"><Building size={14} />고객사 기록 · {customer}</h2>
      <p className="mb-3 text-[12px] text-slate-500">담당자·요구사항·이슈 등 — 이 고객사의 모든 수주에서 함께 보입니다.</p>
      <form action={action} className="no-print mb-3 flex items-start gap-2">
        <textarea name="text" required maxLength={2000} rows={2} placeholder="예: 납품 시 지게차 필수 / 구매 담당 김부장으로 변경" className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-navy focus:outline-none" />
        <Button type="submit">남기기</Button>
      </form>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
            <div className="mb-0.5 text-[11px] text-slate-400"><b className="text-slate-600">{n.actor}</b> · {kst(n.createdAt)}</div>
            <p className="whitespace-pre-wrap">{n.text}</p>
          </li>
        ))}
        {!notes.length && <li className="text-[13px] text-slate-400">아직 기록이 없습니다.</li>}
      </ul>
      {others.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-1 text-[11px] font-bold text-slate-400">이 고객사 다른 수주 ({others.length})</div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {others.map((x) => (
              <li key={x.id}><Link href={`/orders/${x.id}`} className="text-navy-light hover:underline">{x.product}{x.orderNo && ` (${x.orderNo})`}</Link> <span className="text-[11px] text-slate-400">· {STATUS[x.status]}</span></li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
