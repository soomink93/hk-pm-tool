'use client'

import { useState } from 'react'

export type MentionUser = { id: string; name: string; team: string }

// @이름 자동완성이 붙은 댓글 입력창. 끝에 '@부분입력'이 있으면 일치하는 사용자 목록을 띄움.
export function MentionInput({
  value,
  onChange,
  users,
  onEnter,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  users: MentionUser[]
  onEnter?: () => void
  placeholder?: string
  className?: string
}) {
  const [focus, setFocus] = useState(false)
  const m = value.match(/@([가-힣A-Za-z0-9]*)$/)
  const query = m ? m[1] : null
  const matches =
    focus && query !== null && users.length
      ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : []

  function pick(name: string) {
    onChange(value.replace(/@([가-힣A-Za-z0-9]*)$/, `@${name} `))
  }

  return (
    <div className="relative flex-1">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (matches.length) {
              e.preventDefault()
              pick(matches[0].name)
            } else onEnter?.()
          }
        }}
      />
      {matches.length > 0 && (
        <div className="absolute bottom-full z-30 mb-1 w-56 overflow-hidden rounded-md border border-line bg-white shadow-lg">
          {matches.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(u.name) }}
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[12px] hover:bg-slate-50"
            >
              <span className="font-semibold text-navy">@{u.name}</span>
              {u.team && <span className="shrink-0 text-[10px] text-slate-400">{u.team}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
