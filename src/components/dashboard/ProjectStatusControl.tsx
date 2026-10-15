'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 프로젝트 상세 헤더에서 상태를 바로 변경 (편집 권한자에게만 렌더)
const OPTIONS = [
  { v: 'active', label: '진행' },
  { v: 'onhold', label: '보류' },
  { v: 'done', label: '완료' },
]

export function ProjectStatusControl({ projectId, status }: { projectId: string; status: string }) {
  const router = useRouter()
  const [val, setVal] = useState(status)
  const [busy, setBusy] = useState(false)

  async function change(next: string) {
    const prev = val
    setVal(next)
    setBusy(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else {
      setVal(prev)
      alert('상태 변경에 실패했습니다.')
    }
  }

  return (
    <select
      value={val}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-navy outline-none hover:border-navy-light disabled:opacity-60"
      aria-label="프로젝트 상태 변경"
    >
      {OPTIONS.map((o) => (
        <option key={o.v} value={o.v}>{o.label}</option>
      ))}
    </select>
  )
}
