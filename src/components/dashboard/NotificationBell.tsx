'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Handshake, RefreshCw, MessageSquare, KanbanSquare, TriangleAlert, Clock, AtSign, Inbox, CalendarClock, Factory } from 'lucide-react'

type Noti = {
  id: string
  fromTeam: string
  toTeam: string
  content: string
  kind: string
  href: string | null
  read: boolean
  createdAt: string
}

const KIND_LABEL: Record<string, string> = {
  request: '협업 요청', status: '상태 변경', comment: '새 댓글',
  task: '작업 배정', escalation: '결정 요청', reminder: '마감 리마인더', mention: '멘션', admin_request: '관리자 요청',
  order_change: '수주 일정 변경 · 업데이트 필요', order_handoff: '수주 · 착수 가능',
}
const KIND_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  request: Handshake,
  status: RefreshCw,
  comment: MessageSquare,
  task: KanbanSquare,
  escalation: TriangleAlert,
  reminder: Clock,
  mention: AtSign,
  admin_request: Inbox,
  order_change: CalendarClock,
  order_handoff: Factory,
}
const COLLAB_KINDS = ['request', 'status', 'comment']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<Noti[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items ?? [])
      setUnread(d.unread ?? 0)
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const [sortMode, setSortMode] = useState<'smart' | 'recent'>('smart')

  function toggle() {
    setOpen((v) => !v)
  }
  async function markAll() {
    setItems((prev) => prev.map((i) => (i.kind === 'order_change' ? i : { ...i, read: true })))
    setUnread((u) => Math.max(0, u - items.filter((i) => !i.read && i.kind !== 'order_change').length))
    await fetch('/api/notifications', { method: 'PATCH' })
    load()
  }
  async function markOne(n: Noti) {
    if (n.read || n.kind === 'order_change') return
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
    setUnread((u) => Math.max(0, u - 1))
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
  }

  // 정렬: smart = 안읽음 먼저(각 최신순), recent = 순수 최신순
  const sorted = [...items].sort((a, b) => {
    if (sortMode === 'smart' && a.read !== b.read) return a.read ? 1 : -1
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  })

  function go(n: Noti) {
    markOne(n)
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-md p-1.5 text-white/90 transition hover:bg-white/15 print:hidden" aria-label="알림">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-bold text-navy">알림</span>
            {items.some((i) => !i.read) && (
              <button onClick={markAll} className="text-[11px] font-semibold text-navy-light hover:underline">모두 읽음</button>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex gap-1 border-b border-line px-3 py-1.5">
              {([['smart', '안읽음 먼저'], ['recent', '최신순']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setSortMode(m)}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${sortMode === m ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-slate-400">새로운 알림이 없습니다.</p>
            ) : (
              sorted.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Handshake
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n)}
                    className={`flex w-full gap-2.5 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 ${n.read ? 'bg-white opacity-55' : 'bg-blue-50/40'}`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.read ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-navy-light'}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {COLLAB_KINDS.includes(n.kind) && n.fromTeam && n.toTeam ? (
                        <p className="text-[13px]">
                          <b className="text-navy">{n.fromTeam}</b>
                          <span className="text-slate-400"> → </span>
                          <b className="text-navy">{n.toTeam}</b> {KIND_LABEL[n.kind] ?? '알림'}
                        </p>
                      ) : (
                        <p className="text-[13px] font-semibold text-navy">{KIND_LABEL[n.kind] ?? '알림'}</p>
                      )}
                      <p className="mt-0.5 break-words text-xs text-slate-500">{n.content}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
