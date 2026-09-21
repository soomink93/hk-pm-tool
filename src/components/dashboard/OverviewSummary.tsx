'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, AlertTriangle, Handshake, KanbanSquare, Printer, ChevronRight, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { COLLAB_STATE_LABEL, COLLAB_STATE_TONE, TASK_STATUS_LABEL, PRIO_LABEL } from '@/lib/constants'

type Counts = {
  collabActive: number
  tasksOpen: number
  tasksOverdue: number
  escalOpen: number
  escalUrgent: number
}
type Collab = { id: string; fromTeam: string; toTeam: string; content: string; status: string }
type Task = { id: string; title: string; team: string; assignee: string; dueDate: string; priority: string; overdue: boolean }
type Escal = { id: string; item: string; dept: string; needed: string; deadline: string; status: string; urgent: boolean }

type Detail =
  | { kind: 'collab'; data: Collab }
  | { kind: 'task'; data: Task }
  | { kind: 'escal'; data: Escal }

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-slate-50 py-2 last:border-0">
      <span className="w-20 shrink-0 text-[12px] font-semibold text-slate-400">{label}</span>
      <span className="text-[13px] text-slate-700">{children}</span>
    </div>
  )
}

const clickable = 'group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50'

export function OverviewSummary({
  counts,
  activeCollabs,
  attentionTasks,
  pendingEscalations,
}: {
  counts: Counts
  activeCollabs: Collab[]
  attentionTasks: Task[]
  pendingEscalations: Escal[]
}) {
  const [detail, setDetail] = useState<Detail | null>(null)

  const detailLink =
    detail?.kind === 'collab' ? '/collaboration' : detail?.kind === 'task' ? '/tasks' : '/escalation'
  const detailTitle =
    detail?.kind === 'collab' ? '협업 상세' : detail?.kind === 'task' ? '작업 상세' : '결정 요청 상세'

  return (
    <section className="print-area overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-white">
        <ClipboardList size={17} />
        <h2 className="text-sm font-bold">이번 주 운영 요약</h2>
        <span className="ml-auto hidden text-[11px] text-white/70 sm:inline print:hidden">협업 · 작업 · 결정 요청</span>
        <button
          onClick={() => window.print()}
          className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25 print:hidden"
        >
          <Printer size={13} /> PDF
        </button>
      </div>

      <div className="px-5 py-4">
        <p className="text-[15px] leading-relaxed text-slate-700">
          진행 중 협업 <b className="text-navy">{counts.collabActive}</b>건 · 미완료 작업{' '}
          <b className="text-navy">{counts.tasksOpen}</b>개
          {counts.tasksOverdue > 0 && (
            <> ({'지연 '}<b className="text-[#C00000]">{counts.tasksOverdue}</b>)</>
          )}{' '}
          · 오픈 결정 요청 <b className="text-[#C00000]">{counts.escalOpen}</b>건
          {counts.escalUrgent > 0 && (
            <> ({'긴급 '}<b className="text-[#E36C09]">{counts.escalUrgent}</b>)</>
          )}
          .
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* 진행 중 협업 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">
              <Handshake size={13} /> 진행 중 협업 ({activeCollabs.length})
            </div>
            {activeCollabs.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-slate-400">진행 중인 협업이 없습니다.</p>
            ) : (
              <ul>
                {activeCollabs.map((c) => (
                  <li key={c.id}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'collab', data: c })}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          <b className="text-navy">{c.fromTeam}</b>
                          <span className="text-slate-400"> → </span>
                          <b className="text-navy">{c.toTeam}</b>
                        </span>
                        <span className="block truncate text-xs text-slate-500">{c.content}</span>
                      </span>
                      <Badge tone={COLLAB_STATE_TONE[c.status] ?? 'gray'}>{COLLAB_STATE_LABEL[c.status] ?? c.status}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 지연·임박 작업 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">
              <KanbanSquare size={13} /> 지연·임박 작업 ({attentionTasks.length})
            </div>
            {attentionTasks.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-slate-400">지연·임박 작업이 없습니다.</p>
            ) : (
              <ul>
                {attentionTasks.map((t) => (
                  <li key={t.id}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'task', data: t })}>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-navy">{t.title}</b>
                        <span className="block text-xs" style={{ color: t.overdue ? '#C00000' : '#94a3b8' }}>
                          {t.team} · 마감 {t.dueDate}{t.overdue && ' (지연)'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-navy-light print:hidden" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 결정 대기 에스컬레이션 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">
              <AlertTriangle size={13} /> 결정 대기 요청 ({pendingEscalations.length})
            </div>
            {pendingEscalations.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-slate-400">대기 중인 항목이 없습니다.</p>
            ) : (
              <ul>
                {pendingEscalations.map((e) => (
                  <li key={e.id}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'escal', data: e })}>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-navy">{e.item}</b>
                        <span className="block text-xs" style={{ color: e.urgent ? '#C00000' : '#94a3b8' }}>
                          {e.dept} · 기한 {e.deadline}{e.urgent && ' (임박)'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-navy-light print:hidden" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detailTitle}>
        {detail?.kind === 'collab' && (
          <div>
            <Row label="요청 팀">{detail.data.fromTeam}</Row>
            <Row label="협업 팀">{detail.data.toTeam}</Row>
            <Row label="내용">{detail.data.content}</Row>
            <Row label="상태"><Badge tone={COLLAB_STATE_TONE[detail.data.status] ?? 'gray'}>{COLLAB_STATE_LABEL[detail.data.status] ?? detail.data.status}</Badge></Row>
          </div>
        )}
        {detail?.kind === 'task' && (
          <div>
            <Row label="제목">{detail.data.title}</Row>
            <Row label="담당 팀">{detail.data.team}</Row>
            <Row label="담당자">{detail.data.assignee || '—'}</Row>
            <Row label="마감일">
              <span style={{ color: detail.data.overdue ? '#C00000' : undefined }}>
                {detail.data.dueDate || '—'}{detail.data.overdue && ' (지연)'}
              </span>
            </Row>
            <Row label="우선순위">{PRIO_LABEL[detail.data.priority as keyof typeof PRIO_LABEL] ?? detail.data.priority}</Row>
          </div>
        )}
        {detail?.kind === 'escal' && (
          <div>
            <Row label="항목">{detail.data.item}</Row>
            <Row label="요청 부서">{detail.data.dept}</Row>
            <Row label="필요 결정">{detail.data.needed}</Row>
            <Row label="기한">
              <span style={{ color: detail.data.urgent ? '#C00000' : undefined }}>
                {detail.data.deadline}{detail.data.urgent && ' (임박)'}
              </span>
            </Row>
            <Row label="상태">{detail.data.status}</Row>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Link
            href={detailLink}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-light px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy"
          >
            <ExternalLink size={13} /> 해당 탭에서 자세히 보기
          </Link>
        </div>
      </Modal>
    </section>
  )
}
