'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { createOrder, prepareAutofill, runAutofill } from '@/app/(dashboard)/orders/actions'
import { OrderForm } from '@/components/orders/OrderForm'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Modal'

type Fields = { customer: string; product: string; orderNo: string; quantity: string; dueDate: string; specialTerms: string }

// 수주 등록 + PDF 자동입력.
// ① PDF 선택 → 서버에서 텍스트 추출·금액/개인정보 마스킹 (외부 전송 없음)
// ② 사용자가 마스킹 결과 확인(수정 가능) → 동의 시에만 AI로 전송 → 폼 채움
export function NewOrder({ aiEnabled }: { aiEnabled: boolean }) {
  const file = useRef<File | null>(null)
  const [preview, setPreview] = useState<{ text: string; count: number } | null>(null)
  const [values, setValues] = useState<Fields | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  const pick = (f: File | undefined) => {
    setError(''); setPreview(null)
    if (!f) return
    file.current = f
    const fd = new FormData()
    fd.set('file', f)
    start(async () => {
      const r = await prepareAutofill(fd)
      if ('error' in r) setError(r.error)
      else setPreview(r)
    })
  }

  const send = () => start(async () => {
    const r = await runAutofill(preview!.text)
    if ('error' in r) return setError(r.error)
    setValues(r)
    setPreview(null)
    // 같은 PDF를 원본 첨부 칸에 자동으로 넣음
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>('form input[name=file]')
      if (input && file.current) {
        const dt = new DataTransfer()
        dt.items.add(file.current)
        input.files = dt.files
      }
    })
  })

  return (
    <>
      {aiEnabled && (
        <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-violet-800"><Sparkles size={15} />수주기안서 PDF로 자동 입력</div>
          <p className="mb-3 flex items-start gap-1 text-[12px] text-slate-600">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-600" />
            금액·전화·이메일·사업자번호·계좌는 우리 서버에서 먼저 가린 뒤, 확인을 누른 내용만 AI(Anthropic API)로 보냅니다. 보낸 내용은 AI 학습에 쓰이지 않고, 우리 서버 로그에도 남기지 않습니다.
          </p>
          <input type="file" accept="application/pdf,.pdf" disabled={pending} onChange={(e) => pick(e.target.files?.[0])} className="text-[12px]" />
          {pending && <p className="mt-2 flex items-center gap-1 text-[12px] text-slate-500"><Loader2 size={13} className="animate-spin" />처리 중…</p>}
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
          {preview && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-semibold text-slate-700">
                AI로 보낼 내용 (가려진 항목 {preview.count}개) — 더 가릴 내용이 있으면 직접 지우세요
              </div>
              <textarea value={preview.text} onChange={(e) => setPreview({ ...preview, text: e.target.value })} rows={10} className={`${inputClass} bg-white font-mono text-[12px]`} />
              <div className="mt-2 flex gap-2">
                <Button type="button" onClick={send} disabled={pending}>확인 — AI로 보내서 채우기</Button>
                <Button type="button" variant="ghost" onClick={() => setPreview(null)}>취소</Button>
              </div>
            </div>
          )}
          {values && <p className="mt-2 text-[12px] text-green-700">아래 칸을 채웠습니다. 특히 특약사항을 원문과 대조해 확인한 뒤 등록하세요.</p>}
        </div>
      )}
      <OrderForm key={JSON.stringify(values)} action={createOrder} values={values ?? undefined} submit="등록" isNew />
    </>
  )
}
