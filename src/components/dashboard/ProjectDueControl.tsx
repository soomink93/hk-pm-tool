'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 프로젝트 상세 헤더에서 마감일을 바로 변경 (편집 권한자에게만 렌더). 마감은 필수라 비울 수 없음.
export function ProjectDueControl({ projectId, dueDate }: { projectId: string; dueDate: string }) {
  const router = useRouter()
  const [val, setVal] = useState(dueDate)
  const [busy, setBusy] = useState(false)

  async function change(next: string) {
    if (!next) return // 마감 필수
    const prev = val
    setVal(next)
    setBusy(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: next }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else {
      setVal(prev)
      alert('마감일 변경에 실패했습니다.')
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      마감
      <input
        type="date"
        value={val}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="rounded border border-line bg-white px-1.5 py-0.5 text-[11px] text-navy outline-none hover:border-navy-light disabled:opacity-60"
        aria-label="프로젝트 마감일 변경"
      />
    </span>
  )
}
