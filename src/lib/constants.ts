// PoC company_dashboard.html:370-373, :343-350 의 라벨/색/탭 정의 이식

export const STATUS_LABEL = {
  green: '정상 진행',
  yellow: '지연 위험',
  red: '지연 중',
  gray: '미제출',
} as const

export const STATUS_BADGE = {
  green: 'badge-green',
  yellow: 'badge-yellow',
  red: 'badge-red',
  gray: 'badge-gray',
} as const

export const PRIO_LABEL = {
  high: '높음',
  mid: '중간',
  low: '낮음',
} as const

// 우선순위 텍스트 색 (PoC :373) — Tailwind 클래스로 매핑
export const PRIO_CLASS = {
  high: 'text-[#C00000] font-bold',
  mid: 'text-[#E36C09] font-semibold',
  low: 'text-[#70AD47]',
} as const

// 타 부문 협업 — 조율 상태
export const COLLAB_STATUS = ['요청예정', '협의중', '완료'] as const
export const COLLAB_TONE: Record<string, 'gray' | 'yellow' | 'green'> = {
  요청예정: 'gray',
  협의중: 'yellow',
  완료: 'green',
}

export const TABS = [
  { id: 'overview', label: '전체 현황', roles: ['admin', 'chairman', 'executive', 'teamlead'] },
  { id: 'brief', label: '주간 보고', roles: ['admin', 'chairman', 'executive', 'teamlead'] },
  { id: 'kpi', label: 'KPI', roles: ['admin', 'chairman', 'executive', 'teamlead'] },
  { id: 'decisions', label: '결정 로그', roles: ['admin', 'chairman', 'executive'] },
  { id: 'escalation', label: '에스컬레이션', roles: ['admin', 'chairman', 'executive', 'teamlead'] },
  { id: 'settings', label: '설정', roles: ['admin', 'chairman', 'executive', 'teamlead'] },
] as const
