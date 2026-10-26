import type { Order } from '@prisma/client'
import { Field, inputClass } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FLOWS, FLOW_LABEL, type Flow } from '@/lib/orders/stages'
import type { OrderOpts } from '@/lib/orders/options'
import { CompressedFileInput } from './CompressedFileInput'
import { HeadFields } from './HeadFields'
import { ModelFields } from './ModelFields'

type Values = Partial<Pick<Order, 'customer' | 'product' | 'laserSource' | 'laserPower' | 'head' | 'headModel' | 'orderNo' | 'dueDate' | 'specialTerms' | 'notes' | 'productType'>>

// 수주기안서/계약서 핵심 필드 (금액은 민감정보라 받지 않음). 등록·수정 공용 (서버 액션 폼)
// isNew: 등록 화면 — 시작일·원본 첨부 칸 표시
export function OrderForm({
  action, values, submit, isNew, error, opts,
}: {
  action: (f: FormData) => void | Promise<void>
  values?: Values
  submit: string
  isNew?: boolean
  error?: string
  opts: OrderOpts
}) {
  return (
    <form action={action} className="grid gap-x-4 sm:grid-cols-2">
      <Field label="고객사 *"><input name="customer" required defaultValue={values?.customer} className={inputClass} /></Field>
      <Field label="수주번호"><input name="orderNo" defaultValue={values?.orderNo} className={inputClass} /></Field>
      <ModelFields bases={opts.modelBases} sizes={opts.sizes} defaultProduct={values?.product ?? ''} />
      <Field label="발진기 타입">
        <input name="laserSource" list="source-opts" defaultValue={values?.laserSource} className={inputClass} placeholder="예) Raycus" />
        <datalist id="source-opts">{opts.sources.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <Field label="발진기 출력">
        <input name="laserPower" list="power-opts" defaultValue={values?.laserPower} className={inputClass} placeholder="예) 6kW" />
        <datalist id="power-opts">{opts.powers.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <HeadFields heads={opts.heads} headModels={opts.headModels} defaultHead={values?.head ?? ''} defaultHeadModel={values?.headModel ?? ''} />
      <Field label={isNew ? "계약 납기" : "계약 납기 (바꾸면 출하가 납기에 맞춰지고 검사(QC)도 같이 이동)"}><input name="dueDate" type="date" defaultValue={values?.dueDate} className={inputClass} /></Field>
      {isNew && <Field label="일정 시작일 (기본: 오늘)"><input name="startDate" type="date" className={inputClass} /></Field>}
      {isNew && (
        <div className="sm:col-span-2">
          <Field label="제품 구분 (단계 흐름이 정해집니다)">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(Object.keys(FLOWS) as Flow[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-start gap-2 rounded-md border border-line px-3 py-2 text-[12px] has-[:checked]:border-navy-light has-[:checked]:bg-blue-50">
                  <input type="radio" name="productType" value={k} defaultChecked={k === (values?.productType ?? 'undecided')} className="mt-0.5" />
                  <span><b className="text-[13px]">{k === 'undecided' ? '미판정 (설계팀 판정 대기)' : FLOW_LABEL[k]}</b><br /><span className="text-slate-500">{FLOWS[k].join(' → ')}</span></span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      )}
      <div className="sm:col-span-2">
        <Field label="특약사항 (설계팀 양산/커스텀 판단 근거)">
          <textarea name="specialTerms" rows={5} defaultValue={values?.specialTerms} placeholder="예: 고객 지정 도장색, 인증 요구, 사양 변경 조건, 지체상금…" className={inputClass} />
        </Field>
        <Field label="비고"><textarea name="notes" rows={2} defaultValue={values?.notes} className={inputClass} /></Field>
        {isNew && <Field label="원본 첨부 (기안서/계약서 · 이미지는 자동 압축)"><CompressedFileInput name="file" className="text-[12px]" /></Field>}
      </div>
      {isNew && <p className="text-[12px] text-slate-400 sm:col-span-2">등록하면 납기에 맞춰 단계별 일정이 자동 배분됩니다(검사(QC)는 최소 4일). 이후 자유롭게 수정하세요.</p>}
      {error && <p className="mt-1 text-[13px] font-semibold text-red-600 sm:col-span-2">{error}</p>}
      <div className="mt-2 sm:col-span-2"><Button type="submit">{submit}</Button></div>
    </form>
  )
}
