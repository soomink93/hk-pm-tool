// ERP 코드 채번 — 순수함수(기존 코드 목록을 인자로 받음). DB 조회·충돌 재시도는 호출부 액션에서.
// ponytail: 임시 포맷 — Frame8 거래처/품목 샘플 코드 확보 후 아래 접두·자릿수만 조정.
import type { PartnerRole, MaterialType } from '@prisma/client'

const PARTNER_PREFIX: Record<PartnerRole, string> = { customer: 'C', supplier: 'S', both: 'B' }
const MATERIAL_PREFIX: Record<MaterialType, string> = { FG: 'FG', SEMI: 'SM', RAW: 'RM', PART: 'PT', MERCH: 'MC' }

const PAD = 6

// 같은 접두의 기존 코드에서 숫자부 최대값+1을 zero-pad
function next(prefix: string, existing: string[]): string {
  const max = existing
    .filter((c) => c.startsWith(prefix))
    .map((c) => parseInt(c.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return prefix + String(max + 1).padStart(PAD, '0')
}

export const nextPartnerCode = (role: PartnerRole, existing: string[]) => next(PARTNER_PREFIX[role], existing)
export const nextMaterialCode = (type: MaterialType, existing: string[]) => next(MATERIAL_PREFIX[type], existing)
