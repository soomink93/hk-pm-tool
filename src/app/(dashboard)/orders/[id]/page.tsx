import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BellRing, Paperclip, Trash2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { isFullEditor } from '@/lib/rbac'
import { requireMe, teamDepts } from '@/lib/orders/session'
import { canEditLocked, canEditStage, canSetType, isSales } from '@/lib/orders/perm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Gantt, stageBar } from '@/components/orders/Gantt'
import { StageTable } from '@/components/orders/StageTable'
import { OrderForm } from '@/components/orders/OrderForm'
import { CompressedFileInput } from '@/components/orders/CompressedFileInput'
import { getOrderOpts } from '@/lib/orders/optionsServer'
import { ConfirmButton } from '@/components/orders/ConfirmButton'
import { TypeBadge, DelayBadge } from '@/components/orders/badges'
import { ackChanges, addComment, deleteFile, deleteOrder, setOrderStatus, setProductType, updateOrder, uploadFile } from '../actions'
import { CommentBox, MentionText } from '@/components/orders/CommentBox'
import { FLOWS, FLOW_LABEL, delayDays } from '@/lib/orders/stages'
import type { OrderStatus, ProductType } from '@prisma/client'

export const dynamic = 'force-dynamic'

const pill = (on: boolean) => `rounded-md px-3 py-1.5 text-xs font-semibold ${on ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
const kst = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(5, 16).replace('T', ' ')

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [me, depts, opts] = await Promise.all([requireMe(), teamDepts(), getOrderOpts()])
  const { id } = await params
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { seq: 'asc' } },
      logs: { orderBy: { createdAt: 'desc' } },
      files: { select: { id: true, name: true, size: true, uploadedBy: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!o) notFound()

  // 멘션 자동완성 목록 + 이 수주의 멘션·인계 알림은 열면 읽음, '업데이트 필요'는 확인 완료/내 단계 수정 전까지 유지
  const href = `/orders/${o.id}`
  const [users, pendingChanges] = await Promise.all([
    prisma.user.findMany({ select: { name: true, team: true }, orderBy: { name: 'asc' } }),
    prisma.notification.findMany({ where: { recipientUserId: me.id, href, kind: 'order_change', read: false }, orderBy: { createdAt: 'desc' } }),
    prisma.notification.updateMany({ where: { recipientUserId: me.id, href, kind: { in: ['mention', 'order_handoff'] }, read: false }, data: { read: true } }),
  ])
  const teamNames = Object.keys(depts).sort((a, b) => a.localeCompare(b, 'ko'))
  // 배너에 표시할 '내 단계' = 내 팀 단계, 임원은 담당 부문 팀들의 단계
  const mine = (team: string) => team === me.team || (me.role === 'executive' && !!me.department && depts[team] === me.department)
  const myStages = o.stages.filter((s) => mine(s.team) && s.status !== 'done' && s.status !== 'skip').map((s) => s.name)

  const delay = delayDays(o.dueDate, o.stages)
  const sales = isSales(me, depts)
  const isLocked = o.status === 'done' && !canEditLocked(me) // 완료 수주 = 보관(읽기 전용)
  const typeEditable = canSetType(me, depts) && !isLocked
  const editable = Object.fromEntries(o.stages.map((s) => [s.id, !isLocked && canEditStage(me, s, depts)]))

  return (
    <div className="space-y-4">
      {o.status === 'done' && (
        <div className="no-print rounded-lg border border-green-300 bg-green-50 p-3 text-[13px] text-green-800">
          <b>완료되어 보관된 수주입니다{o.completedAt && ` (완료일 ${o.completedAt})`}.</b> 기록은 <Link href="/orders/archive" className="underline">완료 기록</Link>에서 볼 수 있습니다.{isLocked && ' 수정하려면 영업이 상태를 진행으로 되돌리세요.'}
        </div>
      )}
      {pendingChanges.length > 0 && (
        <div className="no-print rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px]">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <BellRing size={15} className="text-amber-600" />
            <b className="text-amber-800">일정이 변경되었습니다 — {myStages.length ? `${myStages.join('·')} 단계 일정을 확인·업데이트하세요` : '일정을 확인하세요'}</b>
            <form action={ackChanges.bind(null, o.id)} className="ml-auto"><button className="rounded bg-amber-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-600">확인 완료</button></form>
          </div>
          <ul className="space-y-0.5 text-[12px] text-slate-700">
            {pendingChanges.map((m) => <li key={m.id}>· {m.content.replace(`${o.customer} · ${o.product}: `, '')} <span className="text-slate-400">({kst(m.createdAt)})</span></li>)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/orders" className="no-print text-xs text-slate-400 hover:text-navy">← 수주 현황</Link>
        <h1 className="text-lg font-bold text-navy">{o.customer} · {o.product}</h1>
        <span className="text-[13px] text-slate-400">{o.orderNo}</span>
        <TypeBadge type={o.productType} />
        {o.dueDate && <DelayBadge days={delay} />}
        {sales ? (
          <div className="no-print ml-auto flex gap-1">
            {(Object.entries({ active: '진행', hold: '보류', done: '완료' }) as [OrderStatus, string][]).map(([k, l]) => (
              <form key={k} action={setOrderStatus.bind(null, o.id, k)}><button className={pill(o.status === k)}>{l}</button></form>
            ))}
          </div>
        ) : (
          <span className="ml-auto badge badge-gray">{{ active: '진행', hold: '보류', done: '완료' }[o.status]}</span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
            {[['수주번호', o.orderNo], ['발진기', [o.laserSource, o.laserPower].filter(Boolean).join(' ')], ['헤드', [o.head, o.headModel].filter(Boolean).join(' ')], ['계약 납기', o.dueDate], ['등록', `${o.createdBy} · ${kst(o.createdAt).slice(0, 5)}`]].map(([k, v]) => (
              <div key={k}><dt className="text-[11px] font-bold text-slate-400">{k}</dt><dd className="font-semibold">{v || '-'}</dd></div>
            ))}
          </dl>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-1 text-[11px] font-bold text-amber-700">특약사항</div>
            <p className="whitespace-pre-wrap text-[13px]">{o.specialTerms || '없음'}</p>
          </div>
          {o.notes && <p className="mt-3 whitespace-pre-wrap text-[13px] text-slate-600">비고: {o.notes}</p>}
          {sales && !isLocked && (
            <details className="no-print mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-navy-light">수주정보 수정 (영업)</summary>
              <div className="mt-3"><OrderForm action={updateOrder.bind(null, o.id)} values={o} submit="저장" opts={opts} /></div>
            </details>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-bold text-navy">제품 구분 (설계팀 판정)</h2>
          <p className="mb-3 text-[12px] text-slate-500">특약사항을 확인해 구분을 정하세요. 바꾸면 그 흐름으로 일정이 다시 배분됩니다.</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(FLOWS) as ProductType[]).map((k) => (
              <form key={k} action={setProductType.bind(null, o.id, k)}>
                {o.productType === k || !typeEditable ? (
                  <button type="button" disabled={!typeEditable} className={`${pill(o.productType === k)} disabled:cursor-default`}>{FLOW_LABEL[k]}</button>
                ) : (
                  <ConfirmButton message={`${FLOW_LABEL[k]}(${FLOWS[k].join(' → ')})로 바꾸고 일정을 다시 배분할까요? 단계별 상태·담당자는 유지되고 날짜와 최초 계획은 새로 잡힙니다.`} className={pill(false)}>{FLOW_LABEL[k]}</ConfirmButton>
                )}
              </form>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">현재 흐름: {FLOWS[o.productType].join(' → ')}{!typeEditable && ' · 변경은 영업 부문·기술연구소'}</p>
          <h2 className="mb-2 mt-5 flex items-center gap-1 text-sm font-bold text-navy"><Paperclip size={14} />첨부 (기안서 · 계약서 · 도면)</h2>
          <ul className="space-y-1 text-[13px]">
            {o.files.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <a href={`/api/orders/files/${f.id}`} target="_blank" className="truncate text-navy-light hover:underline">{f.name}</a>
                <span className="shrink-0 text-[11px] text-slate-400">{Math.ceil(f.size / 1024)}KB</span>
                {(sales || f.uploadedBy === me.name) && (
                  <form action={deleteFile.bind(null, f.id)} className="no-print ml-auto"><ConfirmButton message={`${f.name} 파일을 삭제할까요?`} className="text-slate-300 hover:text-red-600" aria-label="삭제"><Trash2 size={13} /></ConfirmButton></form>
                )}
              </li>
            ))}
            {!o.files.length && <li className="text-slate-400">없음</li>}
          </ul>
          <form action={uploadFile.bind(null, o.id)} className="no-print mt-2 flex items-center gap-2">
            <CompressedFileInput name="file" required className="min-w-0 flex-1 text-[12px]" />
            <Button type="submit" variant="ghost">올리기</Button>
          </form>
          <p className="mt-1 text-[11px] text-slate-400">이미지는 업로드 전 자동 압축 · 그 외 파일은 4MB 이하</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-navy">단계별 일정</h2>
        <Gantt
          legend={false}
          rows={o.stages.filter((s) => s.status !== 'skip').map((s) => ({
            key: s.id,
            label: s.name,
            sub: `${s.team}${s.assignee ? ` · ${s.assignee}` : ''}`,
            bars: [stageBar(s)],
            due: o.dueDate || undefined,
          }))}
        />
        <div className="no-print mt-4"><StageTable stages={o.stages} editable={editable} canShift={sales && !isLocked} teams={teamNames} /></div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-navy">소통 · 변경 이력</h2>
        <CommentBox action={addComment.bind(null, o.id)} users={users.map((x) => ({ name: x.name, team: x.team ?? '' }))} teams={teamNames} />
        <ul className="space-y-2">
          {o.logs.map((l) => (
            <li key={l.id} className={`rounded-lg px-3 py-2 text-[13px] ${l.kind === 'comment' ? 'bg-blue-50' : l.kind === 'handoff' ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-600'}`}>
              <div className="mb-0.5 text-[11px] text-slate-400"><b className="text-slate-600">{l.actor}</b> · {kst(l.createdAt)} {l.kind === 'change' ? '· 변경' : l.kind === 'handoff' ? '· 인계' : ''}</div>
              {l.kind === 'comment' ? <MentionText text={l.text} me={[me.name, me.team ?? '']} /> : <p className="whitespace-pre-wrap">{l.text}</p>}
            </li>
          ))}
        </ul>
      </Card>

      {isFullEditor(me.role) && (
        <form action={deleteOrder.bind(null, o.id)} className="no-print text-right">
          <ConfirmButton message="이 수주와 모든 일정·이력·첨부를 영구 삭제할까요?" className="text-xs text-slate-400 hover:text-red-600">수주 삭제 (관리자)</ConfirmButton>
        </form>
      )}
    </div>
  )
}
