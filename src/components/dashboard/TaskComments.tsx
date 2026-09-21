'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Modal'

export type TaskComment = { id: string; authorName: string; body: string; createdAt: string }

const fmt = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

export function TaskComments({
  taskId,
  comments,
  canComment,
}: {
  taskId: string
  comments: TaskComment[]
  canComment: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!text.trim()) return
    setBusy(true)
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    setBusy(false)
    if (res.ok) {
      setText('')
      setOpen(true)
      router.refresh()
    } else alert('댓글 등록에 실패했습니다.')
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
          {comments.map((m) => (
            <div key={m.id} className="rounded-md bg-slate-50 px-2.5 py-1.5">
              <div className="text-[10px] text-slate-400">
                <b className="text-slate-600">{m.authorName}</b> · {fmt(m.createdAt)}
              </div>
              <div className="text-[12px] text-slate-700">{m.body}</div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-[11px] text-slate-400">아직 댓글이 없습니다.</p>}

          {canComment && (
            <div className="flex gap-1.5">
              <input
                className={`${inputClass} py-1 text-[12px]`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="진행 메모·댓글…"
              />
              <Button onClick={add} disabled={busy || !text.trim()} className="!px-2 !py-1">
                <Send size={12} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
