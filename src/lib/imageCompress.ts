// 브라우저에서 이미지를 축소/압축(JPEG). 클라이언트 컴포넌트에서만 호출(캔버스 사용).
const DEFAULT_MAX = 3.5 * 1024 * 1024
const DEFAULT_DIM = 2200

function toBlob(canvas: HTMLCanvasElement, q: number) {
  return new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q))
}

export async function compressImage(file: File, maxDim = DEFAULT_DIM, maxBytes = DEFAULT_MAX): Promise<File> {
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
  if (Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h)
    w = Math.round(w * s)
    h = Math.round(h * s)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  let q = 0.85
  let blob = await toBlob(canvas, q)
  while (blob && blob.size > maxBytes && q > 0.4) {
    q -= 0.15
    blob = await toBlob(canvas, q)
  }
  if (!blob) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}
