'use client'

import { useState } from 'react'
import { Field, inputClass } from '@/components/ui/Modal'

// 헤드(브랜드) 선택 → 그 헤드의 세부 모델 목록이 바뀌는 의존 콤보박스. 둘 다 직접 입력도 가능(새 값은 다음에 목록에 남음).
export function HeadFields({
  heads,
  headModels,
  defaultHead = '',
  defaultHeadModel = '',
}: {
  heads: string[]
  headModels: Record<string, string[]>
  defaultHead?: string
  defaultHeadModel?: string
}) {
  const [head, setHead] = useState(defaultHead)
  const [hm, setHm] = useState(defaultHeadModel)
  const modelOpts = headModels[head] ?? []

  return (
    <>
      <Field label="헤드">
        <input
          name="head"
          list="head-opts"
          value={head}
          onChange={(e) => { setHead(e.target.value); setHm('') }}
          className={inputClass}
          placeholder="예) Precitec"
        />
        <datalist id="head-opts">{heads.map((h) => <option key={h} value={h} />)}</datalist>
      </Field>
      <Field label="헤드 모델">
        <input
          name="headModel"
          list="headmodel-opts"
          value={hm}
          onChange={(e) => setHm(e.target.value)}
          className={inputClass}
          placeholder={modelOpts[0] ? `예) ${modelOpts[0]}` : '예) Procutter 2.0'}
        />
        <datalist id="headmodel-opts">{modelOpts.map((m) => <option key={m} value={m} />)}</datalist>
      </Field>
    </>
  )
}
