'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function SendWeeklyButton({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function send() {
    if (!confirm('회장·사장·관리자에게 주간 요약 메일을 발송하시겠습니까?')) return
    setBusy(true)
    setMsg('')
    const res = await fetch('/api/reports/weekly/send', { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) setMsg(`✅ 발송 완료: ${(d.sentTo ?? []).join(', ')}`)
    else setMsg(`⚠️ ${d.error ?? '발송 실패'}`)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={send} disabled={busy || !configured} title={configured ? '' : 'SMTP 미설정'}>
        <Mail size={14} /> {busy ? '발송 중…' : '지금 발송'}
      </Button>
      {!configured && <span className="text-[11px] text-[#C00000]">SMTP 미설정 — 발송 불가</span>}
      {msg && <span className="max-w-xs text-right text-[11px] text-slate-500">{msg}</span>}
    </div>
  )
}
