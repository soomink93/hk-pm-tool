'use client'

import { useRef, useState } from 'react'

// 업로드 전 브라우저에서 큰 이미지를 자동 축소/압축(JPEG) → Vercel 4.5MB 한도 통과.
// 이미지가 아니거나 이미 작으면 원본 그대로. 서버 액션 폼의 파일 입력 대체.
const MAX = 3.5 * 1024 * 1024 // 목표 상한(여유 포함)
const MAX_DIM = 2200

function toBlob(canvas: HTMLCanvasElement, q: number) {
  return new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q))
}

async function compress(file: File): Promise<File> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = dataUrl
  })
  let w = img.width
  let h = img.height
  if (Math.max(w, h) > MAX_DIM) {
    const s = MAX_DIM / Math.max(w, h)
    w = Math.round(w * s)
    h = Math.round(h * s)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  let q = 0.85
  let blob = await toBlob(canvas, q)
  while (blob && blob.size > MAX && q > 0.4) {
    q -= 0.15
    blob = await toBlob(canvas, q)
  }
  if (!blob) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export function CompressedFileInput({
  name,
  required,
  className,
}: {
  name: string
  required?: boolean
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setNote(''); return }
    if (!file.type.startsWith('image/') || file.size <= MAX) {
      setNote(file.size > 4 * 1024 * 1024 ? '⚠ 4MB 초과 — 이미지가 아니면 압축되지 않습니다.' : '')
      return
    }
    setBusy(true)
    try {
      const out = await compress(file)
      const dt = new DataTransfer()
      dt.items.add(out)
      if (ref.current) ref.current.files = dt.files
      setNote(`자동 압축: ${(file.size / 1048576).toFixed(1)}MB → ${(out.size / 1048576).toFixed(1)}MB`)
    } catch {
      setNote('압축에 실패했습니다. 더 작은 파일로 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <input ref={ref} type="file" name={name} required={required} onChange={onPick} className={className} />
      {busy && <span className="text-[11px] text-slate-500">압축 중…</span>}
      {!busy && note && <span className="text-[11px] text-slate-400">{note}</span>}
    </span>
  )
}
