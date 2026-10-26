import { prisma } from '@/lib/prisma'
import { MODEL_SEED, SOURCE_SEED, HEAD_SEED, mergeOpts, buildHeadModelMap, type OrderOpts } from './options'

// 시드 + 기존 수주에 쓰인 값(이력) 병합한 콤보박스 옵션
export async function getOrderOpts(): Promise<OrderOpts> {
  const rows = await prisma.order.findMany({ select: { product: true, laserSource: true, head: true, headModel: true } })
  return {
    models: mergeOpts(MODEL_SEED, rows.map((r) => r.product)),
    sources: mergeOpts(SOURCE_SEED, rows.map((r) => r.laserSource)),
    heads: mergeOpts(HEAD_SEED, rows.map((r) => r.head)),
    headModels: buildHeadModelMap(rows.map((r) => ({ head: r.head, headModel: r.headModel }))),
  }
}
