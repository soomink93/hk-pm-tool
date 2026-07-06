'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, AlertTriangle, CircleCheck, Gauge, Printer, ChevronRight, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { STATUS_LABEL, PRIO_LABEL } from '@/lib/constants'
import { STATUS_COLOR } from '@/lib/helpers'

type Counts = { total: number; green: number; yellow: number; red: number; gray: number; submitted: number }
type AttentionTeam = { name: string; lead: string; status: string; risk: string; escalation: string; submitted: boolean }
type UrgentEscal = { item: string; tier: string; dept: string; needed: string; deadline: string; status: string; urgent: boolean }
type PendingDecision = { date: string; content: string; tier: string; decider: string; priority: string; status: string }

type Detail =
  | { kind: 'team'; data: AttentionTeam }
  | { kind: 'escal'; data: UrgentEscal }
  | { kind: 'decision'; data: PendingDecision }

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-slate-50 py-2 last:border-0">
      <span className="w-20 shrink-0 text-[12px] font-semibold text-slate-400">{label}</span>
      <span className="text-[13px] text-slate-700">{children}</span>
    </div>
  )
}

const clickable =
  'group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50'

export function OverviewSummary({
  counts,
  avgKpi,
  attentionTeams,
  urgentEscalations,
  pendingDecisions,
}: {
  counts: Counts
  avgKpi: number | null
  attentionTeams: AttentionTeam[]
  urgentEscalations: UrgentEscal[]
  pendingDecisions: PendingDecision[]
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const attention = counts.yellow + counts.red

  const detailLink =
    detail?.kind === 'team' ? '/brief' : detail?.kind === 'escal' ? '/escalation' : '/decisions'
  const detailTitle =
    detail?.kind === 'team' ? '팀 상태 상세' : detail?.kind === 'escal' ? '에스컬레이션 상세' : '결정 상세'

  return (
    <section className="print-area overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="summary-print-head flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-white">
        <ClipboardList size={17} />
        <h2 className="text-sm font-bold">이번 주 운영 요약</h2>
        <span className="ml-auto hidden text-[11px] text-white/70 sm:inline print:hidden">회장·사장용 한눈에 보기</span>
        <button
          onClick={() => window.print()}
          className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25 print:hidden"
        >
          <Printer size={13} /> PDF
        </button>
      </div>

      <div className="px-5 py-4">
        <p className="text-[15px] leading-relaxed text-slate-700">
          전체 <b className="text-navy">{counts.total}</b>개 팀 중{' '}
          <b className="text-[#70AD47]">정상 {counts.green}</b> ·{' '}
          <b className="text-[#C9A21A]">주의 {counts.yellow}</b> ·{' '}
          <b className="text-[#C00000]">지연 {counts.red}</b> ·{' '}
          <b className="text-slate-400">미제출 {counts.gray}</b>. 이번 주 보고{' '}
          <b className="text-navy">{counts.submitted}/{counts.total}</b> 제출
          {avgKpi !== null && (
            <>
              {' · '}KPI 평균 달성률 <b className="text-navy">{avgKpi}%</b>
            </>
          )}
          .
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* 주의·지연 팀 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">
              <Gauge size={13} /> 주의·지연 팀 ({attention})
            </div>
            {attentionTeams.length === 0 ? (
              <p className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-[#70AD47]">
                <CircleCheck size={14} /> 모든 팀 정상입니다.
              </p>
            ) : (
              <ul>
                {attentionTeams.map((t) => (
                  <li key={t.name}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'team', data: t })}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[t.status] }} />
                      <span className="min-w-0 flex-1">
                        <b className="text-navy">{t.name}</b>
                        <span className="text-slate-400"> · {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL]}</span>
                        {t.risk && t.risk !== '없음' && t.risk !== '—' && (
                          <span className="block truncate text-xs text-slate-500">{t.risk}</span>
                        )}
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
              <AlertTriangle size={13} /> 결정 대기 에스컬레이션 ({urgentEscalations.length})
            </div>
            {urgentEscalations.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-slate-400">대기 중인 항목이 없습니다.</p>
            ) : (
              <ul>
                {urgentEscalations.map((e) => (
                  <li key={e.item}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'escal', data: e })}>
                      <span className="min-w-0 flex-1">
                        <b className="text-navy">{e.item}</b>
                        <span className="text-slate-400"> · {e.dept}</span>
                        <span className="block text-xs" style={{ color: e.urgent ? '#C00000' : '#94a3b8' }}>
                          기한 {e.deadline}
                          {e.urgent && ' (임박)'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-navy-light print:hidden" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 확인 필요 결정 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500">
              <ClipboardList size={13} /> 확인 필요 결정 ({pendingDecisions.length})
            </div>
            {pendingDecisions.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px] text-slate-400">진행 중인 결정이 없습니다.</p>
            ) : (
              <ul>
                {pendingDecisions.map((d, i) => (
                  <li key={i}>
                    <button className={clickable} onClick={() => setDetail({ kind: 'decision', data: d })}>
                      <span className="min-w-0 flex-1">
                        <b className="text-navy">{d.content}</b>
                        <span className="block text-xs text-slate-500">{d.tier} · {d.decider}</span>
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
        {detail?.kind === 'team' && (
          <div>
            <Row label="팀명">{detail.data.name}</Row>
            <Row label="팀장">{detail.data.lead}</Row>
            <Row label="상태"><StatusBadge status={detail.data.status as keyof typeof STATUS_LABEL} /></Row>
            <Row label="리스크">{detail.data.risk || '—'}</Row>
            <Row label="에스컬레이션">{detail.data.escalation || '—'}</Row>
            <Row label="보고 제출">{detail.data.submitted ? '제출 완료' : '미제출'}</Row>
          </div>
        )}
        {detail?.kind === 'escal' && (
          <div>
            <Row label="항목">{detail.data.item}</Row>
            <Row label="단계"><Badge tone="blue">{detail.data.tier}</Badge></Row>
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
        {detail?.kind === 'decision' && (
          <div>
            <Row label="날짜">{detail.data.date}</Row>
            <Row label="내용">{detail.data.content}</Row>
            <Row label="단계"><Badge tone="blue">{detail.data.tier}</Badge></Row>
            <Row label="결정자">{detail.data.decider}</Row>
            <Row label="우선순위">{PRIO_LABEL[detail.data.priority as keyof typeof PRIO_LABEL] ?? detail.data.priority}</Row>
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
