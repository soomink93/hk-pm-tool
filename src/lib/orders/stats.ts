// 현황/완료 기록 통계 (순수 함수 — 화면과 테스트 공용)
import { DELAY_REASONS, diffDays } from './stages'
import type { OrderRecord } from './archive'

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0)

// 월별 추이: 완료월 기준 최근 n개월 (빈 달도 0으로 표시)
export function monthlyTrend(items: { finish: string; r: OrderRecord }[], months = 12, now = new Date()) {
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    keys.push(d.toISOString().slice(0, 7))
  }
  return keys.map((month) => {
    const rs = items.filter((x) => x.finish.startsWith(month)).map((x) => x.r)
    return {
      month,
      count: rs.length,
      onTimeRate: rs.length ? Math.round((rs.filter((r) => r.onTime).length / rs.length) * 100) : null,
      avgLead: rs.length ? avg(rs.map((r) => r.leadDays)) : null,
    }
  })
}

// 이력 문구 "[단계] … · 사유: [분류] 상세" → { stage, reason }. 분류 없는 옛 사유는 '기타(미분류)'
export function parseChangeLog(text: string) {
  const stage = text.match(/^\[([^\]]+)\]/)?.[1]
  const m = text.match(/사유: (?:\[([^\]]+)\])?/)
  if (!stage || !m) return null
  const reason = m[1] && (DELAY_REASONS as readonly string[]).includes(m[1]) ? m[1] : '기타(미분류)'
  return { stage, reason }
}

// 사유별 건수·비율·많이 겪은 부서. team = 그 수주에서 해당 단계를 맡은 팀(수주마다 다를 수 있음)
export function reasonStats(items: { text: string; team: (stage: string) => string }[]) {
  const parsed = items.flatMap(({ text, team }) => {
    const p = parseChangeLog(text)
    return p ? [{ ...p, team: team(p.stage) }] : []
  })
  const m = new Map<string, Map<string, number>>()
  for (const p of parsed) {
    const teams = m.get(p.reason) ?? new Map<string, number>()
    teams.set(p.team, (teams.get(p.team) ?? 0) + 1)
    m.set(p.reason, teams)
  }
  return [...m]
    .map(([reason, teams]) => {
      const count = [...teams.values()].reduce((a, b) => a + b, 0)
      return { reason, count, share: Math.round((count / parsed.length) * 100), teams: [...teams].sort((a, b) => b[1] - a[1]).map(([team, n]) => ({ team, n })) }
    })
    .sort((a, b) => b.count - a.count)
}

// 현재 병목: 진행 중 수주의 미완료 단계 기준. 현재 맡은 수주 수 / 마감 지난 단계 / 총 지연일 / 가장 오래된 지연
type LiveStage = { seq: number; name: string; team: string; end: string; status: string }
type LiveOrder = { id: string; customer: string; product: string; stages: LiveStage[] }

export function currentBottleneck(orders: LiveOrder[], today: string) {
  const m = new Map<string, { team: string; holding: number; doing: number; late: number; lateDays: number; oldest: { orderId: string; label: string; stage: string; days: number } | null }>()
  const row = (team: string) => {
    const r = m.get(team) ?? { team, holding: 0, doing: 0, late: 0, lateDays: 0, oldest: null }
    m.set(team, r)
    return r
  }
  for (const o of orders) {
    const open = o.stages.filter((s) => s.status !== 'done' && s.status !== 'skip').sort((a, b) => a.seq - b.seq)
    if (open[0]) row(open[0].team).holding++ // 지금 이 부서 차례인 수주
    for (const s of open) {
      const r = row(s.team)
      if (s.status === 'doing') r.doing++
      if (s.end < today) {
        const days = diffDays(s.end, today)
        r.late++
        r.lateDays += days
        if (!r.oldest || days > r.oldest.days) r.oldest = { orderId: o.id, label: `${o.customer} · ${o.product}`, stage: s.name, days }
      }
    }
  }
  return [...m.values()].sort((a, b) => b.lateDays - a.lateDays || b.holding - a.holding)
}

// 계획 정확도: 실제 ÷ 계획 (100% = 정확, 100% 초과 = 계획보다 오래 걸림)
export const accuracy = (plan: number, actual: number) => (plan > 0 ? Math.round((actual / plan) * 100) : null)
