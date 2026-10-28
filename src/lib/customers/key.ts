// 고객사 매칭 키: 수주의 customer는 자유 입력이라 "(주)에이스산업"·"에이스산업 " 등을 같은 회사로 묶는다.
// 법인 표기·공백·대소문자만 정규화 — 더 공격적으로 합치면 다른 회사가 섞일 수 있어 여기서 멈춤
const CORP_MARKS = /\(주\)|㈜|\(유\)|㈲|주식회사|유한회사|\b(?:co\.,?\s*ltd|inc|corp)\b\.?/gi

export function customerKey(name: string): string {
  return name.replace(CORP_MARKS, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

export const sameCustomer = (a: string, b: string) => {
  const k = customerKey(a)
  return k !== '' && k === customerKey(b)
}
