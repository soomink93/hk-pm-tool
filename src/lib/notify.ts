import { prisma } from './prisma'
import { mailConfigured, sendMail } from './mailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hk-pm-tool.vercel.app'

// 간단한 알림 이메일 HTML
function notiEmailHtml(title: string, lines: string[], href: string) {
  const navy = '#1F3864'
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:'Malgun Gothic',sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:${navy};color:#fff;padding:16px 20px;font-size:15px;font-weight:800;">${esc(title)}</div>
      <div style="padding:18px 20px;font-size:14px;line-height:1.7;">
        ${lines.map((l) => `<div style="color:#334155;">${esc(l)}</div>`).join('')}
        <div style="text-align:center;margin-top:18px;">
          <a href="${APP_URL}${href}" style="display:inline-block;background:${navy};color:#fff;text-decoration:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;">대시보드에서 보기</a>
        </div>
      </div>
    </div></body></html>`
}

// 이메일 발송(베스트 에포트) — 실패해도 요청 흐름을 막지 않음
async function emailBestEffort(userIds: string[], subject: string, html: string) {
  if (!mailConfigured() || userIds.length === 0) return
  try {
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true } })
    const to = users.map((u) => u.email).filter((e) => /@/.test(e))
    if (to.length) await sendMail({ to, subject, html })
  } catch (e) {
    console.error('알림 이메일 실패:', e instanceof Error ? e.message : e)
  }
}

// 범용 알림: 인앱 알림 생성 + (설정 시) 이메일
export async function notifyUsers(
  recipientIds: string[],
  opts: {
    kind: string
    content: string
    href: string
    fromTeam?: string
    toTeam?: string
    email?: { subject: string; title: string; lines: string[] }
  },
  actorId?: string,
) {
  const ids = new Set(recipientIds)
  if (actorId) ids.delete(actorId)
  const list = [...ids]
  if (list.length === 0) return
  await prisma.notification.createMany({
    data: list.map((uid) => ({
      recipientUserId: uid,
      fromTeam: opts.fromTeam ?? '',
      toTeam: opts.toTeam ?? '',
      content: opts.content,
      kind: opts.kind,
      href: opts.href,
    })),
  })
  if (opts.email) await emailBestEffort(list, opts.email.subject, notiEmailHtml(opts.email.title, opts.email.lines, opts.href))
}

// 특정 팀의 이해관계자: 해당 팀 소속(팀장·팀원) + 그 팀이 속한 부문의 임원
async function teamStakeholders(teamName: string): Promise<string[]> {
  const team = await prisma.team.findUnique({ where: { name: teamName }, select: { department: true } })
  const [members, execs] = await Promise.all([
    prisma.user.findMany({ where: { team: teamName }, select: { id: true } }),
    team?.department
      ? prisma.user.findMany({ where: { role: 'executive', department: team.department }, select: { id: true } })
      : Promise.resolve([] as { id: string }[]),
  ])
  return [...members.map((m) => m.id), ...execs.map((e) => e.id)]
}

// 협업 알림: '관련 팀'의 이해관계자에게만 (요청=받는 팀, 상태·댓글=양쪽 팀) — 행위자 제외
export async function createCollabNotifications(opts: {
  teams: string[]
  fromTeam: string
  toTeam: string
  content: string
  kind: 'request' | 'status' | 'comment'
  actorId: string
}) {
  const lists = await Promise.all(opts.teams.map((t) => teamStakeholders(t)))
  const ids = new Set<string>(lists.flat())
  ids.delete(opts.actorId)
  if (ids.size === 0) return
  const recipients = [...ids]
  await prisma.notification.createMany({
    data: recipients.map((uid) => ({
      recipientUserId: uid,
      fromTeam: opts.fromTeam,
      toTeam: opts.toTeam,
      content: opts.content,
      kind: opts.kind,
      href: '/collaboration',
    })),
  })
  // 협업 '요청'만 이메일(상태변경·댓글은 인앱으로 충분 — 과도한 메일 방지)
  if (opts.kind === 'request') {
    const label = `${opts.fromTeam} → ${opts.toTeam} 협업 요청`
    await emailBestEffort(
      recipients,
      `[HK] ${label}`,
      notiEmailHtml('새 협업 요청', [label, opts.content], '/collaboration'),
    )
  }
}

// 담당자(assignee)에게 작업 배정 알림
export async function notifyTaskAssigned(opts: { assigneeId: string; title: string; team: string; dueDate?: string }, actorId?: string) {
  if (!opts.assigneeId || opts.assigneeId === actorId) return
  await notifyUsers(
    [opts.assigneeId],
    {
      kind: 'task',
      content: `새 작업 배정: ${opts.title}${opts.dueDate ? ` (마감 ${opts.dueDate})` : ''}`,
      href: '/my-tasks',
      email: {
        subject: `[HK] 새 작업 배정: ${opts.title}`,
        title: '새 작업이 배정되었습니다',
        lines: [`작업: ${opts.title}`, `팀: ${opts.team}`, opts.dueDate ? `마감일: ${opts.dueDate}` : '마감일: 미지정'],
      },
    },
    actorId,
  )
}

// 단계별 결정권자를 '해당 부문' 기준으로 정확히 해소
// 1단계 → 해당 팀 팀장, 2단계 → 해당 부문 임원, 3단계 → 회장·사장
async function escalationDeciderIds(dept: string, tier: string): Promise<string[]> {
  if (tier === '3단계') {
    const tops = await prisma.user.findMany({ where: { role: { in: ['chairman', 'president'] } }, select: { id: true } })
    return tops.map((t) => t.id)
  }
  if (tier === '2단계') {
    const team = await prisma.team.findUnique({ where: { name: dept }, select: { department: true } })
    if (!team?.department) return []
    const execs = await prisma.user.findMany({ where: { role: 'executive', department: team.department }, select: { id: true } })
    return execs.map((e) => e.id)
  }
  // 1단계: 해당 팀의 팀장
  const leads = await prisma.user.findMany({ where: { team: dept, role: 'teamlead' }, select: { id: true } })
  return leads.map((l) => l.id)
}

// 결정 요청 등록 시 해당 부문·단계의 결정권자에게만 알림
export async function notifyEscalationCreated(opts: { item: string; dept: string; needed: string; tier: string; deadline?: string }, actorId?: string) {
  const deciderIds = await escalationDeciderIds(opts.dept, opts.tier)
  await notifyUsers(
    deciderIds,
    {
      kind: 'escalation',
      content: `[${opts.tier}] 결정 요청: ${opts.item} (${opts.dept})`,
      href: '/escalation',
      fromTeam: opts.dept,
      email: {
        subject: `[HK] 결정 요청(${opts.tier}): ${opts.item}`,
        title: '새 결정 요청이 올라왔습니다',
        lines: [`항목: ${opts.item}`, `요청 부서: ${opts.dept}`, `필요 결정: ${opts.needed}`, `단계: ${opts.tier}`, opts.deadline ? `기한: ${opts.deadline}` : '기한: 미지정'],
      },
    },
    actorId,
  )
}
