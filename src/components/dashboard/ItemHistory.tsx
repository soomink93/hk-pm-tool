'use client'

import { useState } from 'react'
import { History } from 'lucide-react'

type Log = { action: string; actorName: string; summary: string; createdAt: string }

const ACTION: Record<string, { label: string; color: string }> = {
  create: { label: '생성', color: '#2E8540' },
  update: { label: '수정', color: '#B7791F' },
  delete: { label: '삭제', color: '#C00000' },
  status: { label: '상태변경', color: '#2E75B6' },
}
const fmt = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 항목 변경 이력 토글. entity/id로 /api/history 조회.
export function ItemHistory({ entity, id }: { entity: string; id: string }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<Log[] | null>(null)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && logs === null) {
      try {
        const res = await fetch(`/api/history?entity=${entity}&id=${id}`, { cache: 'no-store' })
        const d = await res.json()
        setLogs(d.items ?? [])
      } catch {
        setLogs([])
      }
    }
  }

  return (
    <div className="mt-1.5">
      <button onClick={toggle} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-navy">
        <History size={11} /> 이력 {open ? '숨기기' : '보기'}
      </button>
      {open && (
        <div className="mt-1.5 border-l-2 border-slate-100 pl-2.5">
          {logs === null ? (
            <p className="text-[11px] text-slate-400">불러오는 중…</p>
          ) : logs.length === 0 ? (
            <p className="text-[11px] text-slate-400">기록 없음</p>
          ) : (
            logs.map((l, i) => {
              const a = ACTION[l.action] ?? { label: l.action, color: '#64748b' }
              return (
                <div key={i} className="py-0.5 text-[11px]">
                  <span className="font-bold" style={{ color: a.color }}>{a.label}</span>
                  <span className="text-slate-500"> · {l.actorName} · {fmt(l.createdAt)}</span>
                  <div className="text-slate-400">{l.summary}</div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
