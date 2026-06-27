'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Building2, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요.')
      return
    }
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (!res || res.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    router.push('/overview')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-9 shadow-xl ring-1 ring-black/5">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
          <Building2 size={24} />
        </div>
        <h1 className="text-lg font-bold text-navy">HK 운영 대시보드</h1>
        <p className="mt-1 text-[13px] text-slate-500">회사 이메일로 로그인하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            이메일
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@hk.co.kr"
            className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none transition focus:border-navy-light"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            비밀번호
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none transition focus:border-navy-light"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-light disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? '로그인 중…' : '로그인'}
        </button>

        {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
      </form>
    </div>
  )
}
