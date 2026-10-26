'use client'

import { useState } from 'react'
import { Field, inputClass } from '@/components/ui/Modal'
import { MODEL_BASE_SEED } from '@/lib/orders/options'

// 모델 = 베이스(FC/HD/FS/RS/K315…) + 사이즈(3015/4020…). 둘을 합쳐 hidden product로 제출. 직접 입력도 가능.
function split(product: string): [string, string] {
  const fams = [...MODEL_BASE_SEED].sort((a, b) => b.length - a.length)
  for (const f of fams) {
    if (product === f) return [f, '']
    if (product.startsWith(f)) return [f, product.slice(f.length)]
  }
  return [product, '']
}

export function ModelFields({ bases, sizes, defaultProduct = '' }: { bases: string[]; sizes: string[]; defaultProduct?: string }) {
  const [b0, s0] = split(defaultProduct)
  const [base, setBase] = useState(b0)
  const [size, setSize] = useState(s0)
  const product = `${base}${size}`.trim()

  return (
    <>
      <input type="hidden" name="product" value={product} />
      <Field label="모델 *">
        <input list="model-base-opts" value={base} onChange={(e) => setBase(e.target.value)} required className={inputClass} placeholder="예) FC" />
        <datalist id="model-base-opts">{bases.map((x) => <option key={x} value={x} />)}</datalist>
      </Field>
      <Field label="모델 사이즈">
        <input list="model-size-opts" value={size} onChange={(e) => setSize(e.target.value)} className={inputClass} placeholder="예) 3015" />
        <datalist id="model-size-opts">{sizes.map((x) => <option key={x} value={x} />)}</datalist>
      </Field>
    </>
  )
}
