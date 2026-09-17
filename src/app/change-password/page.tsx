'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { KeyRound, Loader2 } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    if (pw.next.length < 6) {
      setMsg('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (pw.next !== pw.confirm) {
      setMsg('새 비밀번호가 일치하지 않습니다.')
      return
    }
    setBusy(true)
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: pw.current, next: pw.next }),
    })
    setBusy(false)
    if (res.ok) {
      router.push('/overview')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg(d.error ?? '변경에 실패했습니다.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy to-navy-light p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-9 shadow-xl ring-1 ring-black/5">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <KeyRound size={22} />
          </div>
          <h1 className="text-lg font-bold text-navy">비밀번호 변경</h1>
          <p className="mt-1 text-[13px] text-slate-500">보안을 위해 초기 비밀번호를 변경해 주세요.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">현재 비밀번호</label>
            <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-navy-light" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">새 비밀번호</label>
            <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-navy-light" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">새 비밀번호 확인</label>
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-navy-light" />
          </div>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-light disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? '변경 중…' : '변경하고 계속'}
          </button>
          {msg && <p className="text-center text-[13px] text-red-600">{msg}</p>}
        </form>
        <button onClick={() => signOut({ redirectTo: '/login' })} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600">
          로그아웃
        </button>
      </div>
    </main>
  )
}
