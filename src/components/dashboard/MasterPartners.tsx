'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus, Pencil, Power, X } from 'lucide-react'
import { createPartner, updatePartner, deactivatePartner } from '@/app/(dashboard)/master/actions'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type Contact = { name: string; title: string; phone: string; email: string; isPrimary: boolean }
export type Partner = {
  id: string; code: string | null; name: string; role: string; bizRegNo: string; ceo: string
  bizType: string; bizItem: string; country: string; currency: string; address: string
  paymentTerms: string; memo: string; active: boolean; contacts: Contact[]
}

const ROLE_LABEL: Record<string, string> = { customer: '고객', supplier: '공급사', both: '고객·공급사' }

function PartnerForm({ initial, onClose }: { initial?: Partner; onClose: () => void }) {
  const editing = !!initial
  const [state, action] = useActionState(editing ? updatePartner : createPartner, { error: '' } as { error: string; ok?: boolean })
  const [contacts, setContacts] = useState<Contact[]>(initial?.contacts ?? [])

  useEffect(() => { if (state.ok) onClose() }, [state, onClose]) // 성공 시에만 닫음(에러면 유지)
  const addContact = () => setContacts((c) => [...c, { name: '', title: '', phone: '', email: '', isPrimary: c.length === 0 }])
  const setC = (i: number, k: keyof Contact, v: string | boolean) =>
    setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)))

  return (
    <form action={action}>
      {editing && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="contacts" value={JSON.stringify(contacts)} />
      <Field label="거래처명 *"><input name="name" defaultValue={initial?.name} required className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="구분">
          <select name="role" defaultValue={initial?.role ?? 'customer'} className={inputClass}>
            <option value="customer">고객</option>
            <option value="supplier">공급사</option>
            <option value="both">고객·공급사</option>
          </select>
        </Field>
        <Field label="거래처코드 (비우면 자동)"><input name="code" defaultValue={initial?.code ?? ''} placeholder="자동 채번" className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="사업자등록번호"><input name="bizRegNo" defaultValue={initial?.bizRegNo} className={inputClass} /></Field>
        <Field label="대표자"><input name="ceo" defaultValue={initial?.ceo} className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="업태"><input name="bizType" defaultValue={initial?.bizType} className={inputClass} /></Field>
        <Field label="종목"><input name="bizItem" defaultValue={initial?.bizItem} className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="국가"><input name="country" defaultValue={initial?.country ?? 'KR'} className={inputClass} /></Field>
        <Field label="통화"><input name="currency" defaultValue={initial?.currency ?? 'KRW'} className={inputClass} /></Field>
      </div>
      <Field label="주소"><input name="address" defaultValue={initial?.address} className={inputClass} /></Field>
      <Field label="결제조건"><input name="paymentTerms" defaultValue={initial?.paymentTerms} placeholder="예: 월말 결제" className={inputClass} /></Field>
      <Field label="메모"><input name="memo" defaultValue={initial?.memo} className={inputClass} /></Field>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">담당자</label>
          <button type="button" onClick={addContact} className="flex items-center gap-1 text-[12px] font-semibold text-navy-light hover:underline"><Plus size={13} />추가</button>
        </div>
        {contacts.map((c, i) => (
          <div key={i} className="mb-1.5 flex items-center gap-1.5">
            <input value={c.name} onChange={(e) => setC(i, 'name', e.target.value)} placeholder="이름" className={`${inputClass} py-1.5`} />
            <input value={c.title} onChange={(e) => setC(i, 'title', e.target.value)} placeholder="직책" className={`${inputClass} py-1.5`} />
            <input value={c.phone} onChange={(e) => setC(i, 'phone', e.target.value)} placeholder="연락처" className={`${inputClass} py-1.5`} />
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500" title="주 담당자">
              <input type="checkbox" checked={c.isPrimary} onChange={(e) => setC(i, 'isPrimary', e.target.checked)} />주
            </label>
            <button type="button" onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))} className="shrink-0 text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        ))}
      </div>

      {state.error && <p className="mb-2 text-[12px] text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
        <Button type="submit">{editing ? '저장' : '등록'}</Button>
      </div>
    </form>
  )
}

export function MasterPartners({ partners, canEdit }: { partners: Partner[]; canEdit: boolean }) {
  const [modal, setModal] = useState<{ mode: 'new' } | { mode: 'edit'; p: Partner } | null>(null)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-slate-500">거래처 {partners.length}곳</p>
        {canEdit && <Button onClick={() => setModal({ mode: 'new' })}><Plus size={15} className="mr-1" />새 거래처</Button>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">코드</th><th className="px-3 py-2">거래처명</th><th className="px-3 py-2">구분</th>
              <th className="px-3 py-2">사업자번호</th><th className="px-3 py-2">담당자</th>{canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-3 py-8 text-center text-slate-400">등록된 거래처가 없습니다.</td></tr>
            ) : partners.map((p) => {
              const primary = p.contacts.find((c) => c.isPrimary) ?? p.contacts[0]
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-slate-500">{p.code ?? '—'}</td>
                  <td className="px-3 py-2 font-semibold text-navy">{p.name}</td>
                  <td className="px-3 py-2">{ROLE_LABEL[p.role] ?? p.role}</td>
                  <td className="px-3 py-2 text-slate-500">{p.bizRegNo || '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{primary ? `${primary.name}${primary.title ? ` (${primary.title})` : ''}${p.contacts.length > 1 ? ` 외 ${p.contacts.length - 1}` : ''}` : '—'}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModal({ mode: 'edit', p })} className="text-slate-400 hover:text-navy" title="수정"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm(`'${p.name}'을(를) 비활성 처리할까요?`)) deactivatePartner(p.id) }} className="text-slate-400 hover:text-red-500" title="비활성"><Power size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? '거래처 수정' : '새 거래처'}>
        {modal && <PartnerForm initial={modal.mode === 'edit' ? modal.p : undefined} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  )
}
