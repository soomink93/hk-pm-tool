import { prisma } from '@/lib/prisma'
import { MODEL_BASE_SEED, SIZE_SEED, SOURCE_SEED, POWER_SEED, HEAD_SEED, mergeOpts, buildHeadModelMap, type OrderOpts } from './options'

// 시드 + 기존 수주에 쓰인 값(이력) 병합한 콤보박스 옵션
export async function getOrderOpts(): Promise<OrderOpts> {
  const rows = await prisma.order.findMany({ select: { product: true, laserSource: true, laserPower: true, head: true, headModel: true } })
  return {
    // 모델 베이스: 계열 시드 + 실제 사용된 전체 모델명(FC3015 등)도 선택 가능하게 포함
    modelBases: mergeOpts(MODEL_BASE_SEED, rows.map((r) => r.product)),
    sizes: mergeOpts(SIZE_SEED, []),
    sources: mergeOpts(SOURCE_SEED, rows.map((r) => r.laserSource)),
    powers: mergeOpts(POWER_SEED, rows.map((r) => r.laserPower)),
    heads: mergeOpts(HEAD_SEED, rows.map((r) => r.head)),
    headModels: buildHeadModelMap(rows.map((r) => ({ head: r.head, headModel: r.headModel }))),
  }
}
