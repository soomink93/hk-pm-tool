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
export type Collab = {
  id: string
  fromTeam: string
  toTeam: string
  content: string
  status: string
  createdByName: string
  createdAt: string
  updatedAt: string
  comments: Comment[]
  tasks: LinkedTask[]
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

function CollabCard({
  c,
  myTeam,
  privileged,
  onChanged,
}: {
  c: Collab
  myTeam: string
  privileged: boolean
  onChanged: () => void
}) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const involved = privileged || myTeam === c.fromTeam || myTeam === c.toTeam
  const canRespond = privileged || myTeam === c.toTeam
  const isRequester = privileged || myTeam === c.fromTeam
  const terminal = c.status === 'done' || c.status === 'declined'

  async function setStatus(status: string) {
    setBusy(true)
    const res = await fetch(`/api/collaborations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(false)
    if (res.ok) onChanged()
    else alert('변경에 실패했습니다.')
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
        <span className="ml-auto text-[11px] text-slate-400">요청 {c.createdByName} · {fmt(c.createdAt)}</span>
      </div>

      <p className="text-[14px] text-slate-700">{c.content}</p>

      {/* 액션 */}
      {involved && !terminal && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === 'requested' && canRespond && (
            <>
              <Button onClick={() => setStatus('accepted')} disabled={busy}>수락</Button>
              <Button variant="ghost" onClick={() => setStatus('declined')} disabled={busy}>거절</Button>
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
    </Card>
  )
}

export function CollaborationManager({
  items,
  myTeam,
  teams,
  privileged,
}: {
  items: Collab[]
  myTeam: string
  teams: string[]
  privileged: boolean
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ toTeam: '', content: '' })
  const [busy, setBusy] = useState(false)

  const otherTeams = teams.filter((t) => t !== myTeam)

  const incoming = items.filter((c) => c.toTeam === myTeam)
  const outgoing = items.filter((c) => c.fromTeam === myTeam)
  const others = items.filter((c) => c.toTeam !== myTeam && c.fromTeam !== myTeam)

  function openNew() {
    setForm({ toTeam: otherTeams[0] ?? '', content: '' })
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
            <CollabCard key={c.id} c={c} myTeam={myTeam} privileged={privileged} onChanged={refresh} />
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
          <Section title="받은 요청" list={incoming} />
          <Section title="보낸 요청" list={outgoing} />
          <Section title={myTeam ? '기타 협업' : '전체 협업'} list={others} />
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
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={create} disabled={busy}>{busy ? '요청 중…' : '요청 보내기'}</Button>
        </div>
      </Modal>
    </div>
  )
}
