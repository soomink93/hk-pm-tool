'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Users } from 'lucide-react'

type Noti = { id: string; fromTeam: string; content: string; read: boolean; createdAt: string }

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
    const t = setInterval(load, 60000) // 1분마다 폴링
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      await fetch('/api/notifications', { method: 'PATCH' })
      setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-md p-1.5 text-white/90 transition hover:bg-white/15" aria-label="알림">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10">
          <div className="border-b border-line px-4 py-2.5 text-[13px] font-bold text-navy">협업 요청 알림</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-slate-400">새로운 알림이 없습니다.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="flex gap-2.5 border-b border-slate-50 px-4 py-3 last:border-0">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-navy-light">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px]">
                      <b className="text-navy">{n.fromTeam}</b> 팀이 협업을 요청했습니다.
                    </p>
                    <p className="mt-0.5 break-words text-xs text-slate-500">{n.content}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
