'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Modal'
import { MentionInput, type MentionUser } from './MentionInput'
import { MentionText } from './MentionText'

export type TaskComment = { id: string; authorId?: string; authorName: string; body: string; createdAt: string }

const fmt = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

export function TaskComments({
  taskId,
  comments,
  canComment,
  users = [],
  currentUserId,
}: {
  taskId: string
  comments: TaskComment[]
  canComment: boolean
  users?: MentionUser[]
  currentUserId?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function add() {
    if (!text.trim()) return
    setBusy(true)
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    setBusy(false)
    if (res.ok) { setText(''); setOpen(true); router.refresh() }
    else alert('댓글 등록에 실패했습니다.')
  }
  async function saveEdit(cid: string) {
    if (!editText.trim()) return
    const res = await fetch(`/api/tasks/${taskId}/comments/${cid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editText }),
    })
    if (res.ok) { setEditId(null); router.refresh() }
    else alert('수정에 실패했습니다.')
  }
  async function del(cid: string) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/tasks/${taskId}/comments/${cid}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  return (
    <div className="mt-2 border-t border-slate-50 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-navy"
      >
        <MessageSquare size={12} /> 댓글 {comments.length}개 {open ? '숨기기' : '보기'}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {comments.map((m) => {
            const mine = !!currentUserId && m.authorId === currentUserId
            return (
              <div key={m.id} className="rounded-md bg-slate-50 px-2.5 py-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-400"><b className="text-slate-600">{m.authorName}</b> · {fmt(m.createdAt)}</div>
                  {mine && editId !== m.id && (
                    <div className="flex gap-0.5">
                      <button onClick={() => { setEditId(m.id); setEditText(m.body) }} className="rounded p-0.5 text-slate-400 hover:text-navy-light" aria-label="수정"><Pencil size={11} /></button>
                      <button onClick={() => del(m.id)} className="rounded p-0.5 text-slate-400 hover:text-red-600" aria-label="삭제"><X size={12} /></button>
                    </div>
                  )}
                </div>
                {editId === m.id ? (
                  <div className="mt-1 flex gap-1.5">
                    <MentionInput value={editText} onChange={setEditText} users={users} onEnter={() => saveEdit(m.id)} className={`${inputClass} py-1 text-[12px]`} />
                    <button onClick={() => saveEdit(m.id)} className="rounded p-1 text-slate-500 hover:text-navy-light" aria-label="저장"><Check size={13} /></button>
                    <button onClick={() => setEditId(null)} className="rounded p-1 text-slate-400 hover:text-slate-600" aria-label="취소"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-700"><MentionText text={m.body} /></div>
                )}
              </div>
            )
          })}
          {comments.length === 0 && <p className="text-[11px] text-slate-400">아직 댓글이 없습니다.</p>}

          {canComment && (
            <div className="flex gap-1.5">
              <MentionInput value={text} onChange={setText} users={users} onEnter={add} placeholder="댓글 (@이름 멘션)" className={`${inputClass} py-1 text-[12px]`} />
              <Button onClick={add} disabled={busy || !text.trim()} className="!px-2 !py-1"><Send size={12} /></Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
