'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { addBomLine, deleteBomLine } from '@/app/(dashboard)/master/actions'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Modal'
import { expandBom, type BomLine } from '@/lib/erp/bom'

type Mat = { id: string; code: string; name: string; type: string }
export type BomRow = { id: string; parentId: string; childId: string; qty: number; uom: string }

export function MasterBom({ materials, bom, canEdit }: { materials: Mat[]; bom: BomRow[]; canEdit: boolean }) {
  const parents = materials.filter((m) => m.type === 'FG' || m.type === 'SEMI')
  const [parentId, setParentId] = useState(parents[0]?.id ?? '')
  const [childId, setChildId] = useState('')
  const [qty, setQty] = useState('1')
  const [err, setErr] = useState('')

  const nameOf = (id: string) => {
    const m = materials.find((x) => x.id === id)
    return m ? `${m.name} (${m.code})` : id
  }
  const lines: BomLine[] = bom.map((b) => ({ parentId: b.parentId, childId: b.childId, qty: b.qty }))
  const directRows = bom.filter((b) => b.parentId === parentId)
  const expanded = parentId ? expandBom(parentId, lines) : []

  const add = async () => {
    setErr('')
    const r = await addBomLine(parentId, childId, Number(qty), 'EA')
    if (r.error) setErr(r.error)
    else { setChildId(''); setQty('1') }
  }

  if (parents.length === 0) {
    return <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-[13px] text-slate-400">완제품·반제품 품목을 먼저 등록하세요.</p>
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-[13px] font-semibold text-slate-600">상위 품목</label>
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={`${inputClass} max-w-xs`}>
          {parents.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
        </select>
      </div>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-slate-50 p-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">하위 품목</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className={`${inputClass} min-w-56`}>
              <option value="">선택</option>
              {materials.filter((m) => m.id !== parentId).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">소요량</label>
            <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </div>
          <Button type="button" onClick={add} disabled={!childId}><Plus size={15} className="mr-1" />추가</Button>
          {err && <p className="w-full text-[12px] text-red-600">{err}</p>}
        </div>
      )}

      <div className="mb-5">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">직하위 ({directRows.length})</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">하위 품목</th><th className="px-3 py-2">소요량</th><th className="px-3 py-2">단위</th>{canEdit && <th className="px-3 py-2"></th>}</tr>
            </thead>
            <tbody>
              {directRows.length === 0 ? (
                <tr><td colSpan={canEdit ? 4 : 3} className="px-3 py-6 text-center text-slate-400">등록된 하위 품목이 없습니다.</td></tr>
              ) : directRows.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="px-3 py-2 text-navy">{nameOf(b.childId)}</td>
                  <td className="px-3 py-2">{b.qty}</td>
                  <td className="px-3 py-2 text-slate-500">{b.uom}</td>
                  {canEdit && <td className="px-3 py-2 text-right"><button onClick={() => deleteBomLine(b.id)} className="text-slate-400 hover:text-red-500" title="삭제"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {expanded.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">다단계 전개</p>
          <div className="rounded-lg border border-line p-3 text-[13px]">
            {expanded.map((e, i) => (
              <div key={i} className="py-0.5" style={{ paddingLeft: `${(e.level - 1) * 20}px` }}>
                <span className="text-slate-400">{'└ '.repeat(e.level > 1 ? 1 : 0)}</span>
                <span className="text-navy">{nameOf(e.materialId)}</span>
                <span className="ml-2 text-slate-500">×{e.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
