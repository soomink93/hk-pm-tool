// 수주 일정 권한 — hk-pm-tool 역할(rbac)·부문(department)·팀 기준
import { isFullEditor, type Role } from '../rbac'

export const SALES_DEPT = '국내영업' // 수주 등록·전체 일정 조정
export const DESIGN_DEPT = '기술연구소' // 제품 구분(양산/커스텀/OEM) 판정

export type OrderUser = { role: Role; team: string | null; department: string | null; name: string }
export type TeamDepts = Record<string, string | null | undefined> // 팀명 → 부문

// 소속 부문: 임원은 담당 부문, 팀장은 팀의 부문
export const deptOf = (u: OrderUser, depts: TeamDepts) => u.department || (u.team ? depts[u.team] ?? null : null)

// 영업 권한 = 관리자·회장·사장 + 국내영업 부문(팀장·임원)
export const isSales = (u: OrderUser, depts: TeamDepts) => isFullEditor(u.role) || deptOf(u, depts) === SALES_DEPT

// 단계 수정 = 영업 권한, 그 단계 담당팀 팀장, 담당팀이 속한 부문 임원, 지정 담당자 본인
export function canEditStage(u: OrderUser, s: { team: string; assignee: string }, depts: TeamDepts) {
  if (isSales(u, depts) || u.team === s.team) return true
  if (u.role === 'executive' && u.department && depts[s.team] === u.department) return true
  return !!s.assignee && s.assignee === u.name
}

// 제품 구분 변경(일정 재배분) = 영업 권한 + 기술연구소 부문
export const canSetType = (u: OrderUser, depts: TeamDepts) => isSales(u, depts) || deptOf(u, depts) === DESIGN_DEPT

// 완료(보관)된 수주 수정 = 관리자·회장·사장만
export const canEditLocked = (u: OrderUser) => isFullEditor(u.role)
