// 수주 콤보박스(datalist) 기본값 + 사용 이력 병합. 한번 쓴 값은 다음에 목록에 남음.
export const MODEL_SEED = ['FC3015', 'HD3015', 'FS3015', 'K315']
export const SOURCE_SEED = ['Raycus', 'IPG', 'nLight']
export const HEAD_SEED = ['Precitec', 'Bochu', 'Raytools']
export const HEAD_MODEL_SEED: Record<string, string[]> = {
  Precitec: ['Procutter 2.0'],
  Bochu: [],
  Raytools: [],
}

export const mergeOpts = (seed: string[], used: (string | null | undefined)[]) =>
  [...new Set([...seed, ...used.filter((v): v is string => !!v && v.trim() !== '')])].sort((a, b) => a.localeCompare(b, 'ko'))

// 헤드별 헤드모델 맵: 시드 + 실제 사용된 (head, headModel) 쌍 병합
export function buildHeadModelMap(rows: { head: string; headModel: string }[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {}
  for (const [h, models] of Object.entries(HEAD_MODEL_SEED)) map[h] = new Set(models)
  for (const r of rows) {
    if (!r.head) continue
    ;(map[r.head] ??= new Set())
    if (r.headModel) map[r.head].add(r.headModel)
  }
  return Object.fromEntries(Object.entries(map).map(([h, s]) => [h, [...s].sort((a, b) => a.localeCompare(b, 'ko'))]))
}

export type OrderOpts = {
  models: string[]
  sources: string[]
  heads: string[]
  headModels: Record<string, string[]>
}
