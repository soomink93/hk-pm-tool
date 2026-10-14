import type { ProductType } from '@prisma/client'
import { FLOW_LABEL } from '@/lib/orders/stages'

const TONE: Record<ProductType, string> = { undecided: 'badge-yellow', mass: 'badge-green', custom: 'badge-blue', oem: 'badge-gray' }

export const TypeBadge = ({ type }: { type: ProductType }) => (
  <span className={`badge ${TONE[type]}`}>{type === 'undecided' ? '판정 대기' : FLOW_LABEL[type]}</span>
)

export const DelayBadge = ({ days }: { days: number }) =>
  days > 0 ? <span className="badge badge-red">+{days}일 지연</span> : <span className="badge badge-green">정상</span>
