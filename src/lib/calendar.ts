// YYYY-MM-DD 시작~종료(포함) 사이의 날짜 문자열 목록.
// 종료가 시작보다 앞서면 시작일만. ponytail: 366일 상한(오입력 방어)
export function dateRange(start: string, end?: string | null): string[] {
  const e = end && end >= start ? end : start
  const out: string[] = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(e + 'T00:00:00')
  for (let i = 0; d <= last && i < 366; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}
