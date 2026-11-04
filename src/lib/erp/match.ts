// 수주→품목 자동연결 — 입력 모델명이 품목 마스터와 '정확히 1건' 일치할 때만 id, 애매하면 null.
// (거래처 연결은 lib/customers/key.ts의 customerKey가 담당 — 여기선 품목만.)
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')

type Material = { id: string; name: string; code: string; modelBase: string; size: string }
export function matchMaterialId(product: string, materials: Material[]): string | null {
  const q = norm(product)
  if (!q) return null
  const ids = [...new Set(materials.filter((m) => norm(m.code) === q || norm(m.modelBase + m.size) === q).map((m) => m.id))]
  return ids.length === 1 ? ids[0] : null
}
