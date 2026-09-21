import { prisma } from './prisma'

export type WeeklyDigest = {
  rangeLabel: string
  generatedAt: string
  decisions: {
    total: number
    byCategory: { category: string; count: number }[]
    items: { date: string; content: string; category: string; decider: string; tier: string; status: string }[]
  }
  escalations: {
    newCount: number
    resolvedCount: number
    open: { item: string; dept: string; needed: string; deadline: string; tier: string; urgent: boolean }[]
  }
  tasks: {
    doneCount: number
    overdue: { title: string; team: string; assignee: string; dueDate: string }[]
  }
  collaborations: { newCount: number; doneCount: number; pending: number }
}

const dstr = (d: Date) => d.toISOString().slice(0, 10)

export async function buildWeeklyDigest(): Promise<WeeklyDigest> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86_400_000)
  const today = dstr(now)

  const [decisions, escalations, tasks, collabs] = await Promise.all([
    prisma.decision.findMany({ where: { createdAt: { gte: d7 } }, orderBy: { date: 'desc' } }),
    prisma.escalation.findMany({ orderBy: { deadline: 'asc' } }),
    prisma.task.findMany({}),
    prisma.collaboration.findMany({}),
  ])

  // 결정
  const catMap = new Map<string, number>()
  for (const d of decisions) catMap.set(d.category, (catMap.get(d.category) ?? 0) + 1)
  const byCategory = [...catMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)

  // 결정 요청
  const escNew = escalations.filter((e) => e.createdAt >= d7).length
  const escResolved = escalations.filter((e) => e.status === '완료' && e.updatedAt >= d7).length
  const isUrgent = (deadline: string) => !!deadline && deadline <= dstr(new Date(now.getTime() + 7 * 86_400_000))
  const escOpen = escalations
    .filter((e) => e.status !== '완료')
    .map((e) => ({ item: e.item, dept: e.dept, needed: e.needed, deadline: e.deadline, tier: e.tier, urgent: isUrgent(e.deadline) }))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent))

  // 작업
  const taskDone = tasks.filter((t) => t.status === 'done' && t.updatedAt >= d7).length
  const overdue = tasks
    .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today)
    .map((t) => ({ title: t.title, team: t.team, assignee: t.assignee || '미지정', dueDate: t.dueDate }))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))

  // 협업
  const collabNew = collabs.filter((c) => c.createdAt >= d7).length
  const collabDone = collabs.filter((c) => c.status === 'done' && c.updatedAt >= d7).length
  const collabPending = collabs.filter((c) => ['requested', 'accepted', 'in_progress'].includes(c.status)).length

  return {
    rangeLabel: `${dstr(d7)} ~ ${today}`,
    generatedAt: now.toLocaleString('ko-KR'),
    decisions: {
      total: decisions.length,
      byCategory,
      items: decisions.slice(0, 15).map((d) => ({ date: d.date, content: d.content, category: d.category, decider: d.decider, tier: d.tier, status: d.status })),
    },
    escalations: { newCount: escNew, resolvedCount: escResolved, open: escOpen },
    tasks: { doneCount: taskDone, overdue },
    collaborations: { newCount: collabNew, doneCount: collabDone, pending: collabPending },
  }
}

// ── 이메일 HTML 렌더 (인라인 스타일: 메일 클라이언트 호환) ──
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function renderDigestHtml(d: WeeklyDigest, appUrl = 'https://hk-pm-tool.vercel.app'): string {
  const navy = '#1F3864'
  const gray = '#64748b'
  const line = '#e2e8f0'
  const card = (title: string, body: string) => `
    <div style="border:1px solid ${line};border-radius:10px;padding:16px 18px;margin:0 0 14px;">
      <div style="font-size:14px;font-weight:700;color:${navy};margin:0 0 10px;">${title}</div>
      ${body}
    </div>`
  const stat = (label: string, value: number | string, color = navy) =>
    `<td style="padding:6px 10px;"><div style="font-size:11px;color:${gray};">${label}</div><div style="font-size:22px;font-weight:800;color:${color};">${value}</div></td>`

  const escOpenRows = d.escalations.open.length
    ? d.escalations.open
        .slice(0, 12)
        .map(
          (e) => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};font-weight:600;">${esc(e.item)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${gray};">${esc(e.dept)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};">${esc(e.tier)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${e.urgent ? '#C00000' : gray};font-weight:${e.urgent ? 700 : 400};">${esc(e.deadline || '-')}${e.urgent ? ' (임박)' : ''}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" style="padding:10px;color:${gray};">오픈 결정 요청 없음</td></tr>`

  const overdueRows = d.tasks.overdue.length
    ? d.tasks.overdue
        .slice(0, 12)
        .map(
          (t) => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};font-weight:600;">${esc(t.title)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${gray};">${esc(t.team)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${gray};">${esc(t.assignee)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:#C00000;font-weight:700;">${esc(t.dueDate)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" style="padding:10px;color:${gray};">지연 작업 없음</td></tr>`

  const decRows = d.decisions.items.length
    ? d.decisions.items
        .map(
          (x) => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${gray};white-space:nowrap;">${esc(x.date)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};">${esc(x.category)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};font-weight:600;">${esc(x.content)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${line};color:${gray};">${esc(x.decider)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" style="padding:10px;color:${gray};">지난 주 신규 결정 없음</td></tr>`

  const th = (t: string) => `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid ${line};font-size:11px;color:${gray};text-transform:uppercase;">${t}</th>`

  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:'Malgun Gothic',Apple SD Gothic Neo,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid ${line};">
    <div style="background:${navy};color:#fff;padding:20px 22px;">
      <div style="font-size:18px;font-weight:800;">HK 주간 경영 요약</div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:2px;">${d.rangeLabel}</div>
    </div>
    <div style="padding:20px 22px;">
      ${card(
        '한눈에 보기',
        `<table style="width:100%;border-collapse:collapse;"><tr>
          ${stat('신규 결정', d.decisions.total)}
          ${stat('신규 결정요청', d.escalations.newCount)}
          ${stat('완료 작업', d.tasks.doneCount, '#548235')}
          ${stat('지연 작업', d.tasks.overdue.length, '#C00000')}
        </tr></table>`,
      )}
      ${card(
        `결정 요청 (오픈 ${d.escalations.open.length}건 · 지난주 완료 ${d.escalations.resolvedCount}건)`,
        `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>${th('항목')}${th('부서')}${th('단계')}${th('기한')}</tr></thead><tbody>${escOpenRows}</tbody></table>`,
      )}
      ${card(
        `지연 작업 (${d.tasks.overdue.length}건)`,
        `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>${th('작업')}${th('팀')}${th('담당')}${th('마감')}</tr></thead><tbody>${overdueRows}</tbody></table>`,
      )}
      ${card(
        `지난주 결정 (${d.decisions.total}건)`,
        `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>${th('날짜')}${th('분류')}${th('내용')}${th('결정자')}</tr></thead><tbody>${decRows}</tbody></table>`,
      )}
      ${card(
        '협업',
        `<div style="font-size:13px;color:${gray};">신규 <b style="color:${navy};">${d.collaborations.newCount}</b>건 · 완료 <b style="color:#548235;">${d.collaborations.doneCount}</b>건 · 진행 중 <b style="color:${navy};">${d.collaborations.pending}</b>건</div>`,
      )}
      <div style="text-align:center;margin-top:8px;">
        <a href="${appUrl}/overview" style="display:inline-block;background:${navy};color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">대시보드에서 자세히 보기</a>
      </div>
    </div>
    <div style="padding:14px 22px;border-top:1px solid ${line};color:${gray};font-size:11px;text-align:center;">
      HK 운영 대시보드 · 자동 생성 ${esc(d.generatedAt)}
    </div>
  </div>
</body></html>`
}
