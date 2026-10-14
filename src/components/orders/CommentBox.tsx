'use client'

import { useRef, useState } from 'react'
import { inputClass } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type Option = { name: string; sub: string }

// 댓글 입력 + @ 자동완성 (사용자 이름 / 팀 전체)
export function CommentBox({ action, users, teams }: { action: (f: FormData) => Promise<void>; users: { name: string; team: string }[]; teams: string[] }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const all: Option[] = [...users.map((u) => ({ name: u.name, sub: u.team })), ...teams.map((t) => ({ name: t, sub: '팀 전체' }))]
  // 앞글자 일치 우선, 그다음 포함
  const options = query === null ? [] : all
    .filter((o) => o.name.includes(query))
    .sort((a, b) => Number(b.name.startsWith(query)) - Number(a.name.startsWith(query)))
    .slice(0, 8)

  // 커서 앞의 "@부분입력" 감지
  const detect = () => {
    const el = ref.current!
    const m = el.value.slice(0, el.selectionStart).match(/(?:^|\s)@([가-힣A-Za-z0-9]{0,10})$/)
    setQuery(m ? m[1] : null)
    setActive(0)
  }

  const pick = (name: string) => {
    const el = ref.current!
    const pos = el.selectionStart
    const before = el.value.slice(0, pos).replace(/@[가-힣A-Za-z0-9]{0,10}$/, `@${name} `)
    el.value = before + el.value.slice(pos)
    el.focus()
    el.setSelectionRange(before.length, before.length)
    setQuery(null)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!options.length || e.nativeEvent.isComposing) return // 한글 조합 중 Enter는 조합 확정용
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pick(options[active].name)
    } else if (e.key === 'Escape') setQuery(null)
  }

  return (
    <form
      ref={formRef}
      action={async (f) => {
        await action(f)
        formRef.current?.reset()
      }}
      className="no-print mb-4 flex gap-2"
    >
      <div className="relative flex-1">
        <textarea ref={ref} name="text" required rows={2} onInput={detect} onClick={detect} onKeyDown={onKey} onBlur={() => setTimeout(() => setQuery(null), 150)} placeholder="전달사항을 남기세요. @이름 또는 @팀명(예: @구매)으로 멘션" className={inputClass} />
        {options.length > 0 && (
          <ul className="absolute left-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-md bg-white text-[13px] shadow-lg ring-1 ring-black/10">
            {options.map((o, i) => (
              <li key={`${o.name}-${o.sub}`}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o.name) }} className={`flex w-full justify-between px-3 py-1.5 text-left ${i === active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <span className="font-semibold">@{o.name}</span><span className="text-[11px] text-slate-400">{o.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" className="shrink-0 self-start whitespace-nowrap">등록</Button>
    </form>
  )
}

// 본문의 @멘션 강조 (나 또는 내 팀이면 노란 배경)
export function MentionText({ text, me }: { text: string; me: string[] }) {
  const parts = text.split(/((?<!\S)@[가-힣A-Za-z][가-힣A-Za-z0-9]{1,9})/g)
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        i % 2 ? <span key={i} className={`rounded px-0.5 font-semibold text-navy-light ${me.includes(p.slice(1)) ? 'bg-yellow-200' : ''}`}>{p}</span> : p,
      )}
    </p>
  )
}
