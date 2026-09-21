'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Send, MessageSquare, ArrowRight, KanbanSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { COLLAB_STATE_LABEL, COLLAB_STATE_TONE, TASK_STATUS_LABEL } from '@/lib/constants'

export type Comment = { id: string; authorName: string; body: string; createdAt: string }
export type LinkedTask = { id: string; title: string; status: string }
export type UserOpt = { id: string; name: string; team: string }
export type Collab = {
  id: string
  fromTeam: string
  toTeam: string
  content: string
  status: string
  priority: string
  dueDate: string
  createdByName: string
  createdAt: string
  updatedAt: string
  comments: Comment[]
  tasks: LinkedTask[]
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
const PRIO_TONE: Record<string, 'red' | 'yellow' | 'green'> = { high: 'red', mid: 'yellow', low: 'green' }
const PRIO_LABEL: Record<string, string> = { high: '높음', mid: '중간', low: '낮음' }

function CollabCard({
  c,
  editableTeams,
  users,
  onChanged,
}: {
  c: Collab
  editableTeams: 'all' | string[]
  users: UserOpt[]
  onChanged: () => void
}) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [acceptForm, setAcceptForm] = useState({ assigneeId: '', dueDate: '' })
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const canT = (t: string) => editableTeams === 'all' || editableTeams.includes(t)
  const involved = canT(c.fromTeam) || canT(c.toTeam)
  const canRespond = canT(c.toTeam)
  const isRequester = canT(c.fromTeam)
  const terminal = c.status === 'done' || c.status === 'declined'
  const toTeamMembers = users.filter((u) => u.team === c.toTeam)

  async function setStatus(status: string, extra?: Record<string, string>) {
    setBusy(true)
    const res = await fetch(`/api/collaborations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    setBusy(false)
    if (res.ok) onChanged()
    else alert('변경에 실패했습니다.')
  }
  async function confirmAccept() {
    setAcceptOpen(false)
    await setStatus('accepted', acceptForm)
  }
  async function confirmDecline() {
    if (!declineReason.trim()) return
    setDeclineOpen(false)
    await setStatus('declined', { reason: declineReason })
    setDeclineReason('')
  }
  async function cancel() {
    if (!confirm('이 협업 요청을 취소(삭제)하시겠습니까?')) return
    const res = await fetch(`/api/collaborations/${c.id}`, { method: 'DELETE' })
    if (res.ok) onChanged()
    else alert('취소에 실패했습니다.')
  }
  async function addComment() {
    if (!comment.trim()) return
    setBusy(true)
    const res = await fetch(`/api/collaborations/${c.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: comment }),
    })
    setBusy(false)
    if (res.ok) {
      setComment('')
      setShowComments(true)
      onChanged()
    } else alert('댓글 등록에 실패했습니다.')
  }

  return (
    <Card className="!p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-navy">
          {c.fromTeam} <ArrowRight size={13} className="text-slate-400" /> {c.toTeam}
        </span>
        <Badge tone={COLLAB_STATE_TONE[c.status] ?? 'gray'}>{COLLAB_STATE_LABEL[c.status] ?? c.status}</Badge>
        <Badge tone={PRIO_TONE[c.priority] ?? 'gray'}>{PRIO_LABEL[c.priority] ?? c.priority}</Badge>
        {c.dueDate && <span className="text-[11px] font-semibold text-slate-500">희망 {c.dueDate}</span>}
        <span className="ml-auto text-[11px] text-slate-400">요청 {c.createdByName} · {fmt(c.createdAt)}</span>
      </div>

      <p className="text-[14px] text-slate-700">{c.content}</p>

      {/* 액션 */}
      {involved && !terminal && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === 'requested' && canRespond && (
            <>
              <Button onClick={() => { setAcceptForm({ assigneeId: '', dueDate: c.dueDate ?? '' }); setAcceptOpen(true) }} disabled={busy}>수락</Button>
              <Button variant="ghost" onClick={() => { setDeclineReason(''); setDeclineOpen(true) }} disabled={busy}>거절</Button>
            </>
          )}
          {c.status === 'accepted' && <Button onClick={() => setStatus('in_progress')} disabled={busy}>진행 시작</Button>}
          {c.status === 'in_progress' && <Button onClick={() => setStatus('done')} disabled={busy}>완료 처리</Button>}
          {isRequester && c.status === 'requested' && (
            <Button variant="ghost" onClick={cancel} disabled={busy}>요청 취소</Button>
          )}
        </div>
      )}

      {/* 연결된 작업 */}
      {c.tasks.length > 0 && (
        <div className="mt-3 rounded-md bg-blue-50/50 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-navy-light">
            <KanbanSquare size={12} /> 연결된 작업 ({c.toTeam})
          </div>
          {c.tasks.map((t) => (
            <Link key={t.id} href="/tasks" className="flex items-center justify-between gap-2 py-0.5 text-[13px] text-slate-700 hover:text-navy">
              <span className="truncate">{t.title}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{TASK_STATUS_LABEL[t.status] ?? t.status}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 댓글 */}
      <div className="mt-3 border-t border-slate-50 pt-2.5">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-navy"
        >
          <MessageSquare size={13} /> 댓글 {c.comments.length}개 {showComments ? '숨기기' : '보기'}
        </button>

        {showComments && (
          <div className="mt-2 space-y-2">
            {c.comments.map((m) => (
              <div key={m.id} className="rounded-md bg-slate-50 px-3 py-2">
                <div className="text-[11px] text-slate-400">
                  <b className="text-slate-600">{m.authorName}</b> · {fmt(m.createdAt)}
                </div>
                <div className="text-[13px] text-slate-700">{m.body}</div>
              </div>
            ))}
            {c.comments.length === 0 && <p className="text-[12px] text-slate-400">아직 댓글이 없습니다.</p>}
          </div>
        )}

        {involved && (
          <div className="mt-2 flex gap-2">
            <input
              className={inputClass}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="댓글 입력…"
            />
            <Button onClick={addComment} disabled={busy || !comment.trim()}>
              <Send size={13} />
            </Button>
          </div>
        )}
      </div>

      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="협업 수락 · 작업 배정">
        <p className="mb-3 text-[13px] text-slate-500">
          수락하면 <b className="text-navy">{c.toTeam}</b> 작업 보드에 작업이 생성됩니다. 담당자와 마감일을 지정하세요.
        </p>
        <Field label="담당자">
          <select className={inputClass} value={acceptForm.assigneeId} onChange={(e) => setAcceptForm({ ...acceptForm, assigneeId: e.target.value })}>
            <option value="">미지정 (나중에)</option>
            {toTeamMembers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="마감일 (선택)">
          <input type="date" className={inputClass} value={acceptForm.dueDate} onChange={(e) => setAcceptForm({ ...acceptForm, dueDate: e.target.value })} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAcceptOpen(false)}>취소</Button>
          <Button onClick={confirmAccept} disabled={busy}>수락하고 작업 생성</Button>
        </div>
      </Modal>

      <Modal open={declineOpen} onClose={() => setDeclineOpen(false)} title="협업 거절">
        <p className="mb-3 text-[13px] text-slate-500">
          거절 사유를 남기면 <b className="text-navy">{c.fromTeam}</b>이(가) 확인하고 다시 조율할 수 있습니다.
        </p>
        <Field label="거절 사유 (필수)">
          <textarea
            className={`${inputClass} min-h-20`}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="예: 이번 주 마감이 겹쳐 다음 주부터 가능합니다."
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeclineOpen(false)}>취소</Button>
          <Button onClick={confirmDecline} disabled={busy || !declineReason.trim()}>거절 처리</Button>
        </div>
      </Modal>
    </Card>
  )
}

export function CollaborationManager({
  items,
  myTeam,
  teams,
  users,
  editableTeams,
}: {
  items: Collab[]
  myTeam: string
  teams: string[]
  users: UserOpt[]
  editableTeams: 'all' | string[]
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ toTeam: '', content: '', priority: 'mid', dueDate: '' })
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('active')
  const [teamFilter, setTeamFilter] = useState('all')

  const otherTeams = teams.filter((t) => t !== myTeam)

  const STATUS_FILTERS: { id: string; label: string; match: (s: string) => boolean }[] = [
    { id: 'all', label: '전체', match: () => true },
    { id: 'active', label: '진행 중', match: (s) => s === 'requested' || s === 'accepted' || s === 'in_progress' },
    { id: 'done', label: '완료', match: (s) => s === 'done' },
    { id: 'declined', label: '거절', match: (s) => s === 'declined' },
  ]
  const statusMatch = (STATUS_FILTERS.find((f) => f.id === statusFilter) ?? STATUS_FILTERS[0]).match

  const filtered = items.filter(
    (c) => statusMatch(c.status) && (teamFilter === 'all' || c.fromTeam === teamFilter || c.toTeam === teamFilter),
  )

  const incoming = filtered.filter((c) => c.toTeam === myTeam)
  const outgoing = filtered.filter((c) => c.fromTeam === myTeam)
  const others = filtered.filter((c) => c.toTeam !== myTeam && c.fromTeam !== myTeam)

  function openNew() {
    setForm({ toTeam: otherTeams[0] ?? '', content: '', priority: 'mid', dueDate: '' })
    setOpen(true)
  }
  async function create() {
    if (!form.content.trim()) return
    setBusy(true)
    const res = await fetch('/api/collaborations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? '요청 생성에 실패했습니다.')
    }
  }

  const Section = ({ title, list }: { title: string; list: Collab[] }) =>
    list.length === 0 ? null : (
      <div>
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">{title} ({list.length})</h2>
        <div className="space-y-3">
          {list.map((c) => (
            <CollabCard key={c.id} c={c} editableTeams={editableTeams} users={users} onChanged={refresh} />
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">부서 간 협업</h1>
        {myTeam && (
          <Button onClick={openNew}>
            <Plus size={14} /> 새 협업 요청
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[13px] text-slate-400">아직 협업 요청이 없습니다.</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    f.id === statusFilter ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              className={`${inputClass} w-auto py-1.5`}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">전체 팀</option>
              {teams.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="ml-auto text-[11px] text-slate-400">{filtered.length}건</span>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="py-10 text-center text-[13px] text-slate-400">조건에 맞는 협업이 없습니다.</p>
            </Card>
          ) : (
            <>
              <Section title="받은 요청" list={incoming} />
              <Section title="보낸 요청" list={outgoing} />
              <Section title={myTeam ? '기타 협업' : '전체 협업'} list={others} />
            </>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="새 협업 요청">
        <Field label="협업 대상 팀">
          <select className={inputClass} value={form.toTeam} onChange={(e) => setForm({ ...form, toTeam: e.target.value })}>
            {otherTeams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="협업 필요 내용">
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="예: 신제품 공동 마케팅 자료 제작 협조 요청"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="우선순위">
            <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="high">높음</option>
              <option value="mid">중간</option>
              <option value="low">낮음</option>
            </select>
          </Field>
          <Field label="희망 완료일 (선택)">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={create} disabled={busy}>{busy ? '요청 중…' : '요청 보내기'}</Button>
        </div>
      </Modal>
    </div>
  )
}
