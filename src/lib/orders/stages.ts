// 단계 정의. team = 기본 담당팀(hk-pm-tool 실제 팀명, 수주마다 변경 가능), days = 기본 소요일(납기 없을 때), min = 최소 소요일(변경 불가 하한)
export const STAGES = [
  { name: '영업접수', team: '국내영업팀', days: 3, min: 1, color: '#64748B' },
  { name: '설계검토', team: '제품개발팀', days: 5, min: 1, color: '#7C3AED' }, // 양산/커스텀 판정
  { name: '설계', team: '제품개발팀', days: 15, min: 1, color: '#2E75B6' },
  { name: '구매', team: '구매팀', days: 20, min: 1, color: '#E0A106' },
  { name: '생산', team: 'PQ팀', days: 15, min: 1, color: '#2E8540' },
  { name: '검사(QC)', team: 'QA팀', days: 5, min: 4, color: '#0D9488' }, // QC 최소 4일 고정
  { name: '출하', team: '국내영업팀', days: 2, min: 1, color: '#C2410C' },
] as const

export type StageName = (typeof STAGES)[number]['name']
export const stageDef = (name: string) => STAGES.find((s) => s.name === name)

// 제품 구분별 단계 흐름
export const FLOWS: Record<'undecided' | 'mass' | 'custom' | 'oem', StageName[]> = {
  undecided: ['영업접수', '설계검토', '설계', '구매', '생산', '검사(QC)', '출하'], // 판정 전 기본
  mass: ['영업접수', '설계검토', '구매', '생산', '검사(QC)', '출하'], // 양산: 설계 생략
  custom: ['설계검토', '영업접수', '설계', '구매', '생산', '검사(QC)', '출하'], // 커스텀: 설계검토가 접수보다 먼저
  oem: ['영업접수', '검사(QC)', '출하'],
}
export type Flow = keyof typeof FLOWS
export const FLOW_LABEL: Record<Flow, string> = { undecided: '미판정', mass: '양산', custom: '커스텀', oem: 'OEM' }

// 날짜 변경 사유 분류 (통계용). 이력에는 "사유: [분류] 상세"로 저장
export const DELAY_REASONS = ['부품·자재 입고 지연', '고객 사양 변경', '고객 요청(납기 조정)', '설계 변경·오류', '생산 능력 부족', '품질 문제·재작업', '외주·협력사 지연', '일정 앞당김', '기타'] as const

const DAY = 86_400_000
export const toTs = (d: string) => Date.parse(d + 'T00:00:00Z')
export const fmt = (t: number) => new Date(t).toISOString().slice(0, 10)
export const addDays = (d: string, n: number) => fmt(toTs(d) + n * DAY)
export const diffDays = (a: string, b: string) => Math.round((toTs(b) - toTs(a)) / DAY)
export const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10) // KST

type S = { seq: number; name: string; start: string; end: string; status: string }

// 현재 단계 = 완료/생략 아닌 첫 단계 (없으면 null = 전 단계 완료)
export const currentStage = <T extends S>(stages: T[]) =>
  [...stages].sort((a, b) => a.seq - b.seq).find((s) => s.status !== 'done' && s.status !== 'skip') ?? null

// 예상 완료일(마지막 단계 종료) − 납기. 양수 = 지연일
export function delayDays(due: string, stages: S[]) {
  const live = stages.filter((s) => s.status !== 'skip')
  if (!due || !live.length) return 0
  return diffDays(due, live.reduce((m, s) => (s.end > m ? s.end : m), live[0].end))
}

// 마감 지났는데 미완료
export const isLate = (s: S, now = today()) => s.status !== 'done' && s.status !== 'skip' && s.end < now

// 검사(QC)·출하는 한 묶음: 영업이 둘 중 하나를 옮기면 나머지도 같은 일수만큼 이동 (QC 종료 = 출하 시작 유지)
const PAIR: Record<string, StageName> = { '검사(QC)': '출하', 출하: '검사(QC)' }
export function linkedShift(name: string, prev: { start: string; end: string }, next: { start: string; end: string }) {
  const partner = PAIR[name]
  if (!partner) return null
  // 출하가 움직이면 시작일 기준(앞의 QC를 끌고), QC가 움직이면 종료일 기준(뒤의 출하를 밀고)
  const delta = name === '출하' ? diffDays(prev.start, next.start) : diffDays(prev.end, next.end)
  return delta ? { partner, delta } : null
}
export const SHIP_GROUP: StageName[] = ['검사(QC)', '출하'] // 납기 변경 시 같이 이동

// 완료된 단계 다음으로 넘겨받을 단계 = 뒤쪽의 첫 미완료 단계 (없으면 null = 전 단계 완료)
export const nextStage = <T extends { seq: number; status: string }>(stages: T[], seq: number) =>
  [...stages].sort((a, b) => a.seq - b.seq).find((s) => s.seq > seq && s.status !== 'done' && s.status !== 'skip') ?? null

// 일정 변경 시 업데이트 알림 대상 팀: 바뀐 단계 + 그 이후 미완료 단계(+연동 단계)의 담당팀. fromSeq 없으면 미완료 전체
export function affectedTeams(stages: { seq: number; team: string; status: string; name: string }[], fromSeq = -1, extra: string[] = []) {
  const teams = stages
    .filter((s) => s.status !== 'done' && s.status !== 'skip' && (s.seq >= fromSeq || extra.includes(s.name)))
    .map((s) => s.team)
  return [...new Set(teams)]
}

// 단계 기간이 최소 소요일(QC 4일 등)보다 짧으면 에러 메시지
export function minDaysError(name: string, start: string, end: string) {
  const min = stageDef(name)?.min ?? 1
  return diffDays(start, end) < min ? `${name}는 최소 ${min}일이 필요합니다.` : null
}

// 납기 안에 비례 배분하되 최소 소요일 미달 단계는 최소값으로 고정하고 나머지를 다시 배분
function durations(base: number[], mins: number[], avail: number) {
  const fixed = new Set<number>()
  for (;;) {
    const rest = base.reduce((s, b, i) => (fixed.has(i) ? s : s + b), 0)
    const room = avail - [...fixed].reduce((s, i) => s + mins[i], 0)
    const scale = rest > 0 ? room / rest : 0
    const under = base.findIndex((b, i) => !fixed.has(i) && b * scale < mins[i])
    if (under < 0) return base.map((b, i) => (fixed.has(i) ? mins[i] : b * scale))
    fixed.add(under)
  }
}

// 시작일부터 구분별 흐름대로 단계를 연달아 배치. 납기가 있으면 납기에 맞춰 배분(납기가 너무 짧으면 최소값으로 넘침).
// salesTeam: 영업접수·출하 담당 영업팀 (등록자가 영업 부문이면 그 팀)
export function planStages(flow: Flow, start: string, due?: string, salesTeam?: string) {
  const defs = FLOWS[flow].map((n) => stageDef(n)!)
  const mins = defs.map((d) => d.min)
  const avail = due ? diffDays(start, due) : 0
  const lens = avail > 0 ? durations(defs.map((d) => d.days), mins, avail) : defs.map((d) => Math.max(d.days, d.min))
  let acc = 0
  let cur = start
  return defs.map((d, i) => {
    acc += lens[i]
    // 누적값 반올림 → 마지막 단계 종료일이 납기에 정확히 떨어짐
    const end = addDays(start, Math.max(diffDays(start, cur) + mins[i], Math.round(acc)))
    const team = salesTeam && d.team === '국내영업팀' ? salesTeam : d.team
    const row = { seq: i, name: d.name, team: team as string, start: cur, end, status: 'todo' as const }
    cur = end
    return row
  })
}
