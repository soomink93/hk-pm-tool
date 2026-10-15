'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/Modal'

type Member = {
  id: string
  name: string
  role: string
  title: string | null
  team: string | null
  department: string | null
  projects: { id: string; name: string }[]
}

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자', chairman: '회장', president: '사장', executive: '임원', teamlead: '팀장',
}
const ROLE_TONE: Record<string, 'red' | 'yellow' | 'green' | 'blue' | 'gray'> = {
  admin: 'gray', chairman: 'red', president: 'red', executive: 'yellow', teamlead: 'blue',
}

export function MembersDirectory({ members }: { members: Member[] }) {
  const [q, setQ] = useState('')
  const kw = q.trim().toLowerCase()
  const shown = kw
    ? members.filter((m) =>
        [m.name, m.title, m.team, m.department, ROLE_LABEL[m.role]].some((v) => (v ?? '').toLowerCase().includes(kw)),
      )
    : members

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold text-navy">구성원 <span className="text-xs font-normal text-slate-400">({members.length}명)</span></h1>
        <input
          className={`${inputClass} w-auto min-w-52 py-1.5`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·직급·팀·부서 검색"
        />
      </div>

      {shown.length === 0 ? (
        <Card><p className="py-10 text-center text-[13px] text-slate-400">검색 결과가 없습니다.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <Card key={m.id} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-[15px] font-bold text-white">
                  {m.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-bold text-navy">{m.name}</span>
                    {m.title && <span className="shrink-0 text-[12px] font-semibold text-slate-500">{m.title}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={ROLE_TONE[m.role] ?? 'gray'}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                    <span className="text-[12px] text-slate-500">
                      {m.team || '팀 미지정'}{m.department ? ` · ${m.department}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-50 pt-2.5">
                <div className="mb-1 text-[11px] font-bold text-slate-400">참여 중인 프로젝트 ({m.projects.length})</div>
                {m.projects.length === 0 ? (
                  <p className="text-[12px] text-slate-400">없음</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {m.projects.map((p) => (
                      <Link key={p.id} href={`/projects/${p.id}`} className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] font-semibold text-navy-light hover:bg-blue-100">
                        {p.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
