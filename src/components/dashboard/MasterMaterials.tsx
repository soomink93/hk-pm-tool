'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus, Pencil, Power } from 'lucide-react'
import { createMaterial, updateMaterial, deactivateMaterial } from '@/app/(dashboard)/master/actions'
import { Modal, Field, inputClass } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { MODEL_BASE_SEED, SIZE_SEED } from '@/lib/orders/options'

export type Material = {
  id: string; code: string; name: string; type: string; uom: string
  manageStock: boolean; manageLot: boolean; modelBase: string; size: string; memo: string
}

const TYPE_LABEL: Record<string, string> = { FG: '완제품', SEMI: '반제품', RAW: '원자재', PART: '부품', MERCH: '상품' }
const TYPES = ['FG', 'SEMI', 'RAW', 'PART', 'MERCH'] as const

function MaterialForm({ initial, onClose }: { initial?: Material; onClose: () => void }) {
  const editing = !!initial
  const [state, action] = useActionState(editing ? updateMaterial : createMaterial, { error: '' } as { error: string; ok?: boolean })
  const [type, setType] = useState(initial?.type ?? 'PART')

  useEffect(() => { if (state.ok) onClose() }, [state, onClose]) // 성공 시에만 닫음(에러면 유지)

  return (
    <form action={action}>
      {editing && <input type="hidden" name="id" value={initial.id} />}
      <Field label="품목명 *"><input name="name" defaultValue={initial?.name} required className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="품목구분">
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="품목코드 (비우면 자동)"><input name="code" defaultValue={initial?.code} placeholder="자동 채번" className={inputClass} /></Field>
      </div>
      {type === 'FG' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="모델 베이스">
            <input name="modelBase" defaultValue={initial?.modelBase} list="mb-seed" placeholder="FC / HD …" className={inputClass} />
            <datalist id="mb-seed">{MODEL_BASE_SEED.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="사이즈">
            <input name="size" defaultValue={initial?.size} list="sz-seed" placeholder="3015 / 4020 …" className={inputClass} />
            <datalist id="sz-seed">{SIZE_SEED.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="단위"><input name="uom" defaultValue={initial?.uom ?? 'EA'} className={inputClass} /></Field>
        <div className="mb-3 flex items-end gap-4 pb-2 text-[13px]">
          <label className="flex items-center gap-1.5"><input type="checkbox" name="manageStock" defaultChecked={initial?.manageStock ?? true} />재고관리</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="manageLot" defaultChecked={initial?.manageLot ?? false} />LOT관리</label>
        </div>
      </div>
      <Field label="메모"><input name="memo" defaultValue={initial?.memo} className={inputClass} /></Field>

      {state.error && <p className="mb-2 text-[12px] text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
        <Button type="submit">{editing ? '저장' : '등록'}</Button>
      </div>
    </form>
  )
}

export function MasterMaterials({ materials, canEdit }: { materials: Material[]; canEdit: boolean }) {
  const [modal, setModal] = useState<{ mode: 'new' } | { mode: 'edit'; m: Material } | null>(null)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-slate-500">품목 {materials.length}개</p>
        {canEdit && <Button onClick={() => setModal({ mode: 'new' })}><Plus size={15} className="mr-1" />새 품목</Button>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">코드</th><th className="px-3 py-2">품목명</th><th className="px-3 py-2">구분</th>
              <th className="px-3 py-2">모델</th><th className="px-3 py-2">단위</th>{canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-3 py-8 text-center text-slate-400">등록된 품목이 없습니다.</td></tr>
            ) : materials.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-slate-500">{m.code}</td>
                <td className="px-3 py-2 font-semibold text-navy">{m.name}</td>
                <td className="px-3 py-2">{TYPE_LABEL[m.type] ?? m.type}</td>
                <td className="px-3 py-2 text-slate-500">{m.modelBase ? `${m.modelBase}${m.size}` : '—'}</td>
                <td className="px-3 py-2 text-slate-500">{m.uom}</td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModal({ mode: 'edit', m })} className="text-slate-400 hover:text-navy" title="수정"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`'${m.name}'을(를) 비활성 처리할까요?`)) deactivateMaterial(m.id) }} className="text-slate-400 hover:text-red-500" title="비활성"><Power size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? '품목 수정' : '새 품목'}>
        {modal && <MaterialForm initial={modal.mode === 'edit' ? modal.m : undefined} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  )
}
