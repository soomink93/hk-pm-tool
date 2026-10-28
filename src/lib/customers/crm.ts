// CRM 연동 지점 — 아직 연동된 CRM 없음. 어댑터 하나만 구현해 getCrm()에서 돌려주면
// 고객사 기록이 CRM 노트로도 남고(pushNote), Customer.crmSource/crmId로 회사가 매핑된다.
// 연동 실패는 고객사 기록 저장을 막지 않는다(best-effort).

export type CrmCustomer = { name: string; crmSource: string | null; crmId: string | null }

export interface CrmAdapter {
  source: string // Customer.crmSource에 저장될 값 (예: 'hubspot')
  findCompany(name: string): Promise<string | null> // 이름 → CRM 회사 ID
  pushNote(crmCompanyId: string, note: { text: string; actor: string; createdAt: Date }): Promise<string> // → CRM 노트 ID
}

export function getCrm(): CrmAdapter | null {
  return null
}
