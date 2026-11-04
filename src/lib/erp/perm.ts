// ERP 기준정보 편집 권한 — 거래처=영업 / 품목=생산·연구 / BOM=연구 (+ full editor)
// 조회는 전 구성원(탭 노출로 처리). 공유 판정은 이 한 곳에서만.
import { isFullEditor } from '../rbac'
import { deptOf, isSales, type OrderUser, type TeamDepts } from '../orders/perm'

const RESEARCH_DEPT = '기술연구소'
// ponytail: 생산 부문 정식 명칭 미확인 — 실제 Team.department 값으로 확정 필요
const PRODUCTION_DEPTS = ['생산', '생산기술']

// 거래처 편집 = 영업 권한(= full editor + 국내영업 부문)
export const canEditPartner = (u: OrderUser, depts: TeamDepts) => isSales(u, depts)

// 품목/모델 편집 = 생산·연구 부문 + full editor
export const canEditMaterial = (u: OrderUser, depts: TeamDepts) =>
  isFullEditor(u.role) || [RESEARCH_DEPT, ...PRODUCTION_DEPTS].includes(deptOf(u, depts) ?? '')

// BOM 편집 = 연구(설계) 부문 + full editor
export const canEditBom = (u: OrderUser, depts: TeamDepts) =>
  isFullEditor(u.role) || deptOf(u, depts) === RESEARCH_DEPT
