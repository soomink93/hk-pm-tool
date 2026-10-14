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

// 협업(Collaboration) 상태 — 워크플로
export const COLLAB_STATE_LABEL: Record<string, string> = {
  requested: '요청됨',
  accepted: '수락됨',
  in_progress: '진행중',
  done: '완료',
  declined: '거절됨',
}
export const COLLAB_STATE_TONE: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  requested: 'gray',
  accepted: 'blue',
  in_progress: 'yellow',
  done: 'green',
  declined: 'red',
}

// 작업(Task) 상태
export const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  in_progress: '진행 중',
  done: '완료',
}
export const TASK_COLUMNS = ['todo', 'in_progress', 'done'] as const

// 수주·생산 탭 공개 여부. false = 개발 중(관리자만 보임·알림도 관리자만). 개발 완료 후 true로 바꾸면 전 직원 공개
export const ORDERS_RELEASED = false
const ALL_ROLES = ['admin', 'chairman', 'president', 'executive', 'teamlead']

export const TABS = [
  { id: 'calendar', label: '캘린더', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'overview', label: '전체 현황', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'projects', label: '프로젝트', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'roadmap', label: '로드맵', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'orders', label: '수주·생산', roles: ORDERS_RELEASED ? ALL_ROLES : ['admin'] },
  { id: 'workload', label: '업무량', roles: ['admin', 'chairman', 'president', 'executive'] },
  { id: 'weekly', label: '주간 요약', roles: ['admin', 'chairman', 'president'] },
  { id: 'my-tasks', label: '내 작업', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'collaboration', label: '협업', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'tasks', label: '작업', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'escalation', label: '결정 요청', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'decisions', label: '결정 로그', roles: ['admin', 'chairman', 'president', 'executive'] },
  { id: 'requests', label: '관리자 요청', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
  { id: 'audit', label: '변경 이력', roles: ['admin'] },
  { id: 'settings', label: '설정', roles: ['admin', 'chairman', 'president', 'executive', 'teamlead'] },
] as const
