// 기한이 오늘 이후 ~ 7일 이내면 임박(긴급)
export const isUrgent = (deadline: string): boolean => {
  const d = new Date(deadline).getTime()
  const now = Date.now()
  return Number.isFinite(d) && d - now < 7 * 86_400_000 && d > now
}

// 달성률(%) — 0~100 클램프
export const pct = (current: number, target: number): number =>
  target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

// 달성률 색 등급 (PoC :502 기준)
export const pctTone = (p: number): 'green' | 'yellow' | 'red' =>
  p >= 90 ? 'green' : p >= 60 ? 'yellow' : 'red'

// 팀 상태 → 차트/막대 색 (PoC team-card 색)
export const STATUS_COLOR: Record<string, string> = {
  green: '#70AD47',
  yellow: '#FFC000',
  red: '#C00000',
  gray: '#BFBFBF',
}

// 현재 연도/주차 라벨 (PoC :378)
export const getWeek = (): string => {
  const n = new Date()
  const start = new Date(n.getFullYear(), 0, 1)
  const week = Math.ceil(((n.getTime() - start.getTime()) / 86_400_000 + 1) / 7)
  return `${n.getFullYear()}년 ${week}주차`
}
