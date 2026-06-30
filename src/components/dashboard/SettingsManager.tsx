'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, KeyRound, Users, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { STATUS_LABEL } from '@/lib/constants'

type Role = 'admin' | 'chairman' | 'executive' | 'teamlead'
const ROLE_LABEL: Record<string, string> = { admin: '관리자', chairman: '회장님', executive: '임원', teamlead: '팀장' }

export type UserRow = { id: string; name: string; email: string; role: string; team: string | null }
export type TeamRow = { id: string; name: string; lead: string; status: string }

export function SettingsManager({
  users,
  teams,
  currentUserId,
  canManage,
}: {
  users: UserRow[]
  teams: TeamRow[]
  currentUserId: string
  canManage: boolean
}) {
  const router = useRouter()

  // 사용자 추가 모달
  const [userOpen, setUserOpen] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'teamlead' as Role, team: '', password: '' })
  const [busy, setBusy] = useState(false)

  // 팀 모달
  const [teamOpen, setTeamOpen] = useState(false)
  const [teamEditId, setTeamEditId] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', lead: '', status: 'green' })

  // 비밀번호
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function addUser() {
    setBusy(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    })
    setBusy(false)
    if (res.ok) {
      setUserOpen(false)
      setUserForm({ name: '', email: '', role: 'teamlead', team: '', password: '' })
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? '저장에 실패했습니다.')
    }
  }

  async function delUser(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? '삭제에 실패했습니다.')
    }
  }

  function openAddTeam() {
    setTeamEditId(null)
    setTeamForm({ name: '', lead: '', status: 'green' })
    setTeamOpen(true)
  }
  function openEditTeam(t: TeamRow) {
    setTeamEditId(t.id)
    setTeamForm({ name: t.name, lead: t.lead, status: t.status })
    setTeamOpen(true)
  }
  async function saveTeam() {
    setBusy(true)
    const res = await fetch(teamEditId ? `/api/teams/${teamEditId}` : '/api/teams', {
      method: teamEditId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    })
    setBusy(false)
    if (res.ok) {
      setTeamOpen(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? '저장에 실패했습니다.')
    }
  }
  async function delTeam(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('삭제에 실패했습니다.')
  }

  async function changePassword() {
    setPwMsg(null)
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: pw.current, next: pw.next }),
    })
    if (res.ok) {
      setPwMsg({ ok: true, text: '비밀번호가 변경되었습니다.' })
      setPw({ current: '', next: '', confirm: '' })
    } else {
      const d = await res.json().catch(() => ({}))
      setPwMsg({ ok: false, text: d.error ?? '변경에 실패했습니다.' })
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold text-navy">설정</h1>

      {canManage && (
        <Card>
          <h2 className="mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2.5 text-sm font-bold text-navy">
            <Users size={15} /> 사용자 관리
          </h2>
          <div className="divide-y divide-slate-50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 py-2">
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{u.name}</div>
                  <div className="text-xs text-slate-400">
                    {u.email} · {ROLE_LABEL[u.role] ?? u.role}
                    {u.team ? ` · ${u.team}` : ''}
                  </div>
                </div>
                {u.id !== currentUserId && (
                  <button onClick={() => delUser(u.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button onClick={() => setUserOpen(true)}>
              <Plus size={14} /> 사용자 추가
            </Button>
          </div>
        </Card>
      )}

      {canManage && (
        <Card>
          <h2 className="mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2.5 text-sm font-bold text-navy">
            <Building2 size={15} /> 팀 관리
          </h2>
          <div className="divide-y divide-slate-50">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-2">
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{t.name}</div>
                  <div className="text-xs text-slate-400">
                    팀장: {t.lead} · {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] ?? t.status}
                  </div>
                </div>
                <button onClick={() => openEditTeam(t)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-light" aria-label="수정">
                  <Pencil size={14} />
                </button>
                <button onClick={() => delTeam(t.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button onClick={openAddTeam}>
              <Plus size={14} /> 팀 추가
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2.5 text-sm font-bold text-navy">
          <KeyRound size={15} /> 내 비밀번호 변경
        </h2>
        <div className="max-w-sm space-y-3">
          <Field label="현재 비밀번호">
            <input type="password" className={inputClass} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="새 비밀번호">
            <input type="password" className={inputClass} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <Field label="새 비밀번호 확인">
            <input type="password" className={inputClass} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={changePassword}>변경</Button>
            {pwMsg && <span className={`text-xs ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</span>}
          </div>
        </div>
      </Card>

      {/* 사용자 추가 모달 */}
      <Modal open={userOpen} onClose={() => setUserOpen(false)} title="사용자 추가">
        <Field label="이름">
          <input className={inputClass} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
        </Field>
        <Field label="이메일">
          <input type="email" className={inputClass} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="name@hk.co.kr" />
        </Field>
        <Field label="역할">
          <select className={inputClass} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}>
            <option value="teamlead">팀장</option>
            <option value="executive">임원</option>
            <option value="chairman">회장님</option>
            <option value="admin">관리자</option>
          </select>
        </Field>
        <Field label="팀 / 부문">
          <input className={inputClass} value={userForm.team} onChange={(e) => setUserForm({ ...userForm, team: e.target.value })} placeholder="예) 영업팀" />
        </Field>
        <Field label="초기 비밀번호">
          <input type="password" className={inputClass} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setUserOpen(false)}>취소</Button>
          <Button onClick={addUser} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>

      {/* 팀 추가/수정 모달 */}
      <Modal open={teamOpen} onClose={() => setTeamOpen(false)} title={teamEditId ? '팀 수정' : '팀 추가'}>
        <Field label="팀명">
          <input
            className={inputClass}
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            readOnly={!!teamEditId}
            placeholder="예) 기획팀"
          />
        </Field>
        <Field label="팀장 이름">
          <input className={inputClass} value={teamForm.lead} onChange={(e) => setTeamForm({ ...teamForm, lead: e.target.value })} placeholder="예) 홍길동" />
        </Field>
        <Field label="상태">
          <select className={inputClass} value={teamForm.status} onChange={(e) => setTeamForm({ ...teamForm, status: e.target.value })}>
            <option value="green">정상 진행</option>
            <option value="yellow">지연 위험</option>
            <option value="red">지연 중</option>
            <option value="gray">미제출</option>
          </select>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setTeamOpen(false)}>취소</Button>
          <Button onClick={saveTeam} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
        </div>
      </Modal>
    </div>
  )
}
