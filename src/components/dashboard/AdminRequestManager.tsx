'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CornerDownRight, CheckSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'

export type AdminRequest = {
  id: string
  content: string
  status: string
  reply: string | null
  createdByName: string
  createdById: string
  createdAt: string
}

export function AdminRequestManager({
  requests,
  isAdmin,
  currentUserId,
}: {
  requests: AdminRequest[]
  isAdmin: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [content, setContent] = useState('')
  const [handleId, setHandleId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const openCount = requests.filter((r) => r.status !== '처리완료').length

  async function submit() {
    if (!content.trim()) return
    setBusy(true)
    const res = await fetch('/api/admin-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setBusy(false)
    if (res.ok) {
      setAddOpen(false)
      setContent('')
      router.refresh()
    } else alert('등록에 실패했습니다.')
  }

  function openHandle(r: AdminRequest) {
    setHandleId(r.id)
    setReply(r.reply ?? '')
    setAddOpen(false)
  }
  async function handle(status: string) {
    if (!handleId) return
    setBusy(true)
    const res = await fetch(`/api/admin-requests/${handleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reply }),
    })
    setBusy(false)
    if (res.ok) {
      setHandleId(null)
      router.refresh()
    } else alert('처리에 실패했습니다.')
  }
  async function remove(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/admin-requests/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  const handling = requests.find((r) => r.id === handleId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-navy">관리자 요청</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={14} /> 요청 작성
        </Button>
      </div>

      <p className="text-[12px] text-slate-400">
        {isAdmin
          ? `전체 요청 ${requests.length}건 · 대기중 ${openCount}건`
          : '팀 추가·권한·오류 등 관리자에게 전달할 요청을 남기세요. 처리되면 알림이 갑니다.'}
      </p>

      <Card>
        {requests.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-400">등록된 요청이 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => {
              const done = r.status === '처리완료'
              const canDelete = isAdmin || (r.createdById === currentUserId && !done)
              return (
                <div key={r.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone={done ? 'green' : 'yellow'}>{r.status}</Badge>
                        <span className="text-[11px] text-slate-400">
                          {r.createdByName} · {r.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-medium text-navy">{r.content}</p>
                      {r.reply && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
                          <CornerDownRight size={13} className="mt-0.5 shrink-0 text-navy-light" />
                          <span className="whitespace-pre-wrap"><b className="text-navy">관리자 답변</b> · {r.reply}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {isAdmin && (
                        <button onClick={() => openHandle(r)} className="rounded px-2 py-1 text-[11px] font-semibold text-navy-light hover:bg-slate-100">
                          처리
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(r.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 요청 작성 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="관리자 요청 작성">
        <Field label="요청 내용">
          <textarea
            className={`${inputClass} min-h-28`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="예: 신규 팀 '해외영업2팀' 추가 요청, 계정 권한 변경, 오류 제보 등"
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAddOpen(false)}>취소</Button>
          <Button onClick={submit} disabled={busy}>{busy ? '등록 중…' : '등록'}</Button>
        </div>
      </Modal>

      {/* 관리자 처리 */}
      <Modal open={!!handleId} onClose={() => setHandleId(null)} title="요청 처리">
        {handling && (
          <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
            <div className="text-[11px] text-slate-400">{handling.createdByName} · {handling.createdAt.slice(0, 10)}</div>
            <p className="mt-0.5 whitespace-pre-wrap font-medium text-navy">{handling.content}</p>
          </div>
        )}
        <Field label="답변 (선택)">
          <textarea className={`${inputClass} min-h-24`} value={reply} onChange={(e) => setReply(e.target.value)} />
        </Field>
        <div className="mt-5 flex justify-between gap-2">
          <Button variant="ghost" onClick={() => handle('대기중')} disabled={busy}>대기중으로</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setHandleId(null)}>닫기</Button>
            <Button onClick={() => handle('처리완료')} disabled={busy}>
              <CheckSquare size={14} /> {busy ? '처리 중…' : '처리완료'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
