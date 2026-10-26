'use server'

// 수주·생산 일정 서버 액션 (hk-order-tracker 이식). 권한은 lib/orders/perm, 알림은 lib/notify 공용 사용
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isFullEditor } from '@/lib/rbac'
import { ORDERS_RELEASED } from '@/lib/constants'
import { notifyUsers, teamStakeholders } from '@/lib/notify'
import { parseMentionNames } from '@/lib/mentions'
import { requireMe, teamDepts } from '@/lib/orders/session'
import { SALES_DEPT, canEditLocked, canEditStage, canSetType, isSales } from '@/lib/orders/perm'
import { MAX_FILE, extractFields, extractFieldsFromImage, isPdf, isSupportedImage, pdfToRedactedText, type ExtractedFields } from '@/lib/orders/extract'
import { DELAY_REASONS, FLOWS, FLOW_LABEL, SHIP_GROUP, addDays, affectedTeams, diffDays, linkedShift, minDaysError, nextStage, planStages, today, type Flow } from '@/lib/orders/stages'
import type { OrderStatus, ProductType, StageStatus } from '@prisma/client'

type Me = Awaited<ReturnType<typeof requireMe>>

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const fail = (msg: string): never => { throw new Error(msg) }
const log = (orderId: string, actor: string, text: string, kind = 'change') =>
  prisma.orderLog.create({ data: { orderId, actor, text, kind } })
const stagesOf = (orderId: string) => prisma.stage.findMany({ where: { orderId }, select: { seq: true, team: true, status: true, name: true, assignee: true } })
const href = (orderId: string) => `/orders/${orderId}`
const done = (orderId: string) => {
  revalidatePath(href(orderId))
  revalidatePath('/orders')
  revalidatePath('/orders/archive')
}

// 공개 전(ORDERS_RELEASED=false)에는 수주 알림을 관리자에게만 — 볼 수 없는 페이지로 가는 알림·메일 방지
async function visibleTo(ids: string[]) {
  if (ORDERS_RELEASED || !ids.length) return ids
  const admins = await prisma.user.findMany({ where: { id: { in: ids }, role: 'admin' }, select: { id: true } })
  return admins.map((a) => a.id)
}

// 팀(팀원+부문 임원) + 지정 담당자 이름 → 알림 (본인 제외). kind: order_change(확인 전까지 유지) | order_handoff
async function notifyOrderTeams(orderId: string, teams: string[], actorId: string, kind: 'order_change' | 'order_handoff', text: string, names: string[] = []) {
  const [ids, named, order] = await Promise.all([
    Promise.all(teams.map(teamStakeholders)),
    names.length ? prisma.user.findMany({ where: { name: { in: names } }, select: { id: true } }) : [],
    prisma.order.findUnique({ where: { id: orderId }, select: { customer: true, product: true } }),
  ])
  const label = order ? `${order.customer} · ${order.product}` : '수주'
  const title = kind === 'order_change' ? '수주 일정 변경 — 업데이트 필요' : '이전 단계 완료 — 착수 가능'
  await notifyUsers(
    await visibleTo([...ids.flat(), ...named.map((u) => u.id)]),
    { kind, content: `${label}: ${text}`, href: href(orderId), email: { subject: `[HK] ${title}: ${label}`, title, lines: [label, text] } },
    actorId,
  )
}

// 완료된 수주는 보관 상태 → 관리자·회장·사장 외 수정 불가 (영업이 '진행'으로 되돌린 뒤 수정)
const LOCKED = '완료되어 보관된 수주입니다. 수정하려면 영업이 상태를 \'진행\'으로 되돌리세요.'
const locked = (status: OrderStatus, u: Me) => status === 'done' && !canEditLocked(u)

// 상태 변화에 따라 실제 착수일/완료일 기록 (실적 데이터)
function actualDates(s: { status: StageStatus; startedAt: string | null; doneAt: string | null }, next: StageStatus) {
  if (next === 'todo' || next === 'skip') return { startedAt: null, doneAt: null }
  if (next === 'doing') return { startedAt: s.startedAt ?? today(), doneAt: null }
  return { doneAt: s.status === 'done' && s.doneAt ? s.doneAt : today() }
}

// 금액은 민감정보라 보관하지 않음
const ORDER_FIELDS = { orderNo: '수주번호', customer: '고객사', product: '모델', laserSource: '발진기 타입', laserPower: '발진기 출력', head: '헤드', headModel: '헤드 모델', dueDate: '납기', specialTerms: '특약사항', notes: '비고' } as const
type OrderField = keyof typeof ORDER_FIELDS

function readOrder(f: FormData) {
  const o = Object.fromEntries(Object.keys(ORDER_FIELDS).map((k) => [k, str(f, k)])) as Record<OrderField, string>
  if (!o.customer || !o.product) fail('고객사와 모델은 필수입니다.')
  if (o.dueDate && !isDate(o.dueDate)) fail('납기 형식이 올바르지 않습니다.')
  return o
}

// 폼의 'file' 필드 → 저장용 데이터 (없으면 null)
async function readFile(f: FormData) {
  const file = f.get('file')
  if (!(file instanceof File) || file.size === 0) return null
  if (file.size > MAX_FILE) fail('파일은 4MB 이하만 첨부할 수 있습니다.')
  return { name: file.name.slice(0, 200), mime: file.type || 'application/octet-stream', size: file.size, data: new Uint8Array(await file.arrayBuffer()) }
}

// useActionState용: 실패 사유를 {error}로 반환(폼에 표시), 성공 시 redirect(try 밖이라 NEXT_REDIRECT는 그대로 전파)
export async function createOrder(_prev: { error: string }, f: FormData): Promise<{ error: string }> {
  let orderId: string
  try {
    const [u, depts] = await Promise.all([requireMe(), teamDepts()])
    if (!isSales(u, depts)) return { error: '수주 등록은 영업 부문만 할 수 있습니다.' }
    const o = readOrder(f)
    const start = isDate(str(f, 'startDate')) ? str(f, 'startDate') : today()
    const type = (str(f, 'productType') in FLOWS ? str(f, 'productType') : 'undecided') as Flow
    const salesTeam = u.team && depts[u.team] === SALES_DEPT ? u.team : undefined
    const file = await readFile(f)
    const order = await prisma.order.create({
      data: {
        ...o,
        productType: type,
        createdBy: u.name,
        stages: { create: planStages(type, start, o.dueDate || undefined, salesTeam).map((s) => ({ ...s, baseStart: s.start, baseEnd: s.end })) },
        logs: { create: { kind: 'change', actor: u.name, text: `수주 등록 · ${FLOW_LABEL[type]}${file ? ` (첨부: ${file.name})` : ''}` } },
        ...(file && { files: { create: { ...file, uploadedBy: u.name } } }),
      },
    })
    orderId = order.id
  } catch (e) {
    console.error('createOrder failed:', (e as Error).name)
    return { error: e instanceof Error && /[가-힣]/.test(e.message) ? e.message : '등록에 실패했습니다. 입력값을 확인하거나 잠시 후 다시 시도하세요.' }
  }
  revalidatePath('/orders')
  redirect(href(orderId))
}

export async function updateOrder(id: string, f: FormData) {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!isSales(u, depts)) fail('수주정보 수정은 영업 부문만 할 수 있습니다.')
  const o = readOrder(f)
  const prev = await prisma.order.findUniqueOrThrow({ where: { id } })
  if (locked(prev.status, u)) fail(LOCKED)
  const changed = (Object.keys(ORDER_FIELDS) as OrderField[]).filter((k) => prev[k] !== o[k])
  if (!changed.length) return
  // 납기 변경 → 출하 종료일이 새 납기에 맞도록 검사(QC)·출하를 같이 이동 (나머지 단계는 각 부서가 조정)
  const shipStages = o.dueDate && o.dueDate !== prev.dueDate
    ? await prisma.stage.findMany({ where: { orderId: id, name: { in: SHIP_GROUP }, status: { not: 'done' } } })
    : []
  const shipEnd = shipStages.find((s) => s.name === '출하')?.end
  const dueDelta = shipEnd ? diffDays(shipEnd, o.dueDate) : 0
  const ship = dueDelta ? shipStages : []
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: o }),
    ...ship.map((s) => prisma.stage.update({ where: { id: s.id }, data: { start: addDays(s.start, dueDelta), end: addDays(s.end, dueDelta) } })),
  ])
  const desc = changed.map((k) => (k === 'specialTerms' || k === 'notes' ? `${ORDER_FIELDS[k]} 수정` : `${ORDER_FIELDS[k]}: ${prev[k] || '-'} → ${o[k] || '-'}`))
  if (ship.length) desc.push(`${ship.map((s) => s.name).join('·')} ${dueDelta > 0 ? '+' : ''}${dueDelta}일 연동 이동`)
  const text = `수주정보 변경 · ${desc.join(', ')}`
  await log(id, u.name, text)
  await notifyOrderTeams(id, affectedTeams(await stagesOf(id)), u.id, 'order_change', text) // 미완료 단계 전 부서
  done(id)
}

// 제품 구분 변경 → 해당 흐름으로 일정 재배분 (같은 이름 단계의 상태·담당팀·담당자는 유지, 최초 계획도 새 일정으로)
export async function setProductType(id: string, type: ProductType) {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!canSetType(u, depts)) fail('제품 구분은 영업 부문·기술연구소만 바꿀 수 있습니다.')
  if (!(type in FLOWS)) return
  const o = await prisma.order.findUniqueOrThrow({ where: { id }, include: { stages: true } })
  if (locked(o.status, u)) fail(LOCKED)
  if (o.productType === type) return
  const start = o.stages.reduce((m, s) => (s.start < m ? s.start : m), o.stages[0]?.start ?? today())
  const prev = new Map(o.stages.map((s) => [s.name, s]))
  const plan = planStages(type, start, o.dueDate || undefined, prev.get('영업접수')?.team)
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { productType: type } }),
    prisma.stage.deleteMany({ where: { orderId: id } }),
    prisma.stage.createMany({
      data: plan.map((s) => {
        const p = prev.get(s.name)
        return { ...s, team: p?.team ?? s.team, orderId: id, baseStart: s.start, baseEnd: s.end, status: p && p.status !== 'skip' ? p.status : 'todo', assignee: p?.assignee ?? '' }
      }),
    }),
  ])
  const text = `제품 구분: ${FLOW_LABEL[o.productType]} → ${FLOW_LABEL[type]} · 일정 재배분 (${FLOWS[type].join(' → ')})`
  await log(id, u.name, text)
  await notifyOrderTeams(id, affectedTeams(await stagesOf(id)), u.id, 'order_change', text)
  done(id)
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!isSales(u, depts)) fail('권한이 없습니다.')
  await prisma.order.update({ where: { id }, data: { status, completedAt: status === 'done' ? today() : null } })
  await log(id, u.name, `수주 상태: ${{ active: '진행', hold: '보류', done: '완료' }[status]}`)
  done(id)
}

export async function deleteOrder(id: string) {
  const u = await requireMe()
  if (!isFullEditor(u.role)) fail('권한이 없습니다.')
  await prisma.order.delete({ where: { id } })
  revalidatePath('/orders')
  redirect('/orders')
}

const STAGE_STATUS: Record<StageStatus, string> = { todo: '대기', doing: '진행', done: '완료', skip: '생략' }

// 날짜 변경 시 사유 필수 → 회의에서 "왜 밀렸나" 추적. 반환값 = 에러 메시지(없으면 성공)
export async function updateStage(
  stageId: string,
  next: { start: string; end: string; status: StageStatus; assignee: string; team: string },
  reason: { category: string; detail: string }, // 날짜 변경 사유 (분류는 통계용)
  shiftNext = false, // 종료일 변경분만큼 이후 미완료 단계도 같이 이동
): Promise<string | undefined> {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  const sales = isSales(u, depts)
  if (!isDate(next.start) || !isDate(next.end) || next.end < next.start) return '날짜가 올바르지 않습니다. (종료 ≥ 시작)'
  if (!(next.status in STAGE_STATUS)) return '상태가 올바르지 않습니다.'
  const s = await prisma.stage.findUniqueOrThrow({ where: { id: stageId }, include: { order: { select: { status: true } } } })
  if (locked(s.order.status, u)) return LOCKED
  if (!canEditStage(u, s, depts)) return '이 단계는 담당팀 팀장·부문 임원·지정 담당자·영업만 바꿀 수 있습니다.'
  if (shiftNext && !sales) return '이후 단계 일괄 이동은 영업 부문만 할 수 있습니다.'
  const team = next.team.trim() || s.team
  if (team !== s.team && !sales) return '담당팀 변경은 영업 부문만 할 수 있습니다.'
  if (team !== s.team && !(team in depts)) return '존재하지 않는 팀입니다.'
  const tooShort = minDaysError(s.name, next.start, next.end) // QC 최소 4일 등
  if (tooShort) return tooShort
  const assignee = next.assignee.trim()
  const parts: string[] = []
  if (s.start !== next.start) parts.push(`시작 ${s.start} → ${next.start}`)
  if (s.end !== next.end) parts.push(`종료 ${s.end} → ${next.end}`)
  const dateChanged = parts.length > 0
  const category = reason.category.trim()
  const detail = reason.detail.trim().slice(0, 300)
  if (dateChanged && !(DELAY_REASONS as readonly string[]).includes(category)) return '날짜 변경 사유를 선택하세요.'
  if (dateChanged && category === '기타' && !detail) return '기타 사유는 내용을 적어주세요.'
  if (s.status !== next.status) parts.push(`상태 ${STAGE_STATUS[s.status]} → ${STAGE_STATUS[next.status]}`)
  if (s.team !== team) parts.push(`담당팀 ${s.team} → ${team}`)
  if (s.assignee !== assignee) parts.push(`담당 ${s.assignee || '-'} → ${assignee || '-'}`)
  if (!parts.length) return
  const delta = diffDays(s.end, next.end)
  const later = shiftNext && delta !== 0
    ? await prisma.stage.findMany({ where: { orderId: s.orderId, seq: { gt: s.seq }, status: { not: 'done' } } })
    : []
  if (later.length) parts.push(`이후 ${later.length}개 단계 ${delta > 0 ? '+' : ''}${delta}일 이동`)
  // 영업이 QC/출하를 옮기면 짝 단계도 같이 이동 (이후 단계 일괄 이동에 이미 포함되면 생략)
  const link = sales ? linkedShift(s.name, s, next) : null
  const partner = link && !later.some((l) => l.name === link.partner)
    ? await prisma.stage.findFirst({ where: { orderId: s.orderId, name: link.partner, status: { not: 'done' } } })
    : null
  if (partner) parts.push(`${partner.name} ${link!.delta > 0 ? '+' : ''}${link!.delta}일 연동 이동`)
  await prisma.$transaction([
    prisma.stage.update({ where: { id: stageId }, data: { start: next.start, end: next.end, status: next.status, team, assignee, ...actualDates(s, next.status) } }),
    ...later.map((l) => prisma.stage.update({ where: { id: l.id }, data: { start: addDays(l.start, delta), end: addDays(l.end, delta) } })),
    ...(partner ? [prisma.stage.update({ where: { id: partner.id }, data: { start: addDays(partner.start, link!.delta), end: addDays(partner.end, link!.delta) } })] : []),
  ])
  const text = `[${s.name}] ${parts.join(', ')}${dateChanged ? ` · 사유: [${category}]${detail ? ` ${detail}` : ''}` : ''}`
  await log(s.orderId, u.name, text)
  // 날짜가 움직였거나 담당팀이 바뀌면 이 단계 이후 부서(+새 담당팀)에 업데이트 알림
  if (dateChanged || team !== s.team) {
    await notifyOrderTeams(s.orderId, affectedTeams(await stagesOf(s.orderId), s.seq, partner ? [partner.name] : []), u.id, 'order_change', text)
  }
  // 완료 처리 → 다음 단계 부서(+지정 담당자)에 '착수 가능'. 마지막 단계면 영업(영업접수 담당팀)에 '전 단계 완료'
  if (s.status !== 'done' && next.status === 'done') {
    const all = await stagesOf(s.orderId)
    const nxt = nextStage(all, s.seq)
    const salesTeam = all.find((x) => x.name === '영업접수')?.team ?? '국내영업팀'
    const msg = nxt ? `[${s.name}] 완료 → [${nxt.name}] 착수 가능` : `[${s.name}] 완료 · 전 단계 완료`
    await log(s.orderId, u.name, msg, 'handoff')
    await notifyOrderTeams(s.orderId, [nxt ? nxt.team : salesTeam], u.id, 'order_handoff', msg, nxt?.assignee ? [nxt.assignee] : [])
  }
  // 전 단계 완료 → 수주 자동 완료(보관). 관리자가 완료 수주의 단계를 되돌리면 다시 진행
  const allDone = (await stagesOf(s.orderId)).every((x) => x.status === 'done' || x.status === 'skip')
  if (allDone && s.order.status !== 'done') {
    await prisma.order.update({ where: { id: s.orderId }, data: { status: 'done', completedAt: today() } })
    await log(s.orderId, u.name, '전 단계 완료 → 수주 완료 처리 (완료 기록에 보관)')
  } else if (!allDone && s.order.status === 'done') {
    await prisma.order.update({ where: { id: s.orderId }, data: { status: 'active', completedAt: null } })
    await log(s.orderId, u.name, '완료 단계 변경 → 수주 다시 진행')
  }
  // 내 단계를 손봤으면 이 수주의 내 '업데이트 필요' 알림은 처리된 것으로
  await ackOrderChanges(u.id, s.orderId)
  done(s.orderId)
}

const ackOrderChanges = (userId: string, orderId: string) =>
  prisma.notification.updateMany({ where: { recipientUserId: userId, href: href(orderId), kind: 'order_change', read: false }, data: { read: true } })

// 수주 상세 배너의 '확인 완료' — 이 수주의 내 업데이트 알림 읽음 처리
export async function ackChanges(orderId: string) {
  const u = await requireMe()
  await ackOrderChanges(u.id, orderId)
  done(orderId)
}

// 댓글 + @이름/@팀명 멘션 알림 (팀명이면 그 팀 팀원)
export async function addComment(orderId: string, f: FormData) {
  const u = await requireMe()
  const text = str(f, 'text').slice(0, 2000)
  if (!text) return
  await log(orderId, u.name, text, 'comment')
  const names = parseMentionNames(text)
  if (names.length) {
    const [users, order] = await Promise.all([
      prisma.user.findMany({ where: { OR: [{ name: { in: names } }, { team: { in: names } }] }, select: { id: true } }),
      prisma.order.findUnique({ where: { id: orderId }, select: { customer: true, product: true } }),
    ])
    await notifyUsers(await visibleTo(users.map((x) => x.id)), { kind: 'mention', content: `${order?.customer ?? '수주'} · ${order?.product ?? ''}: ${text.slice(0, 80)}`, href: href(orderId) }, u.id)
  }
  done(orderId)
}

export async function uploadFile(orderId: string, f: FormData) {
  const u = await requireMe()
  const file = await readFile(f)
  if (!file) return
  await prisma.orderFile.create({ data: { orderId, ...file, uploadedBy: u.name } })
  await log(orderId, u.name, `첨부 추가: ${file.name}`)
  done(orderId)
}

export async function deleteFile(fileId: string) {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  const f = await prisma.orderFile.findUniqueOrThrow({ where: { id: fileId }, select: { uploadedBy: true } })
  if (!isSales(u, depts) && f.uploadedBy !== u.name) fail('첨부는 올린 사람·영업 부문만 삭제할 수 있습니다.')
  const file = await prisma.orderFile.delete({ where: { id: fileId }, select: { orderId: true, name: true } })
  await log(file.orderId, u.name, `첨부 삭제: ${file.name}`)
  done(file.orderId)
}

// AI 자동입력 1단계: PDF → 서버에서 텍스트 추출 + 금액/개인정보 마스킹. 아직 외부 전송 없음.
export async function prepareAutofill(f: FormData): Promise<{ text: string; count: number } | { error: string }> {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!isSales(u, depts)) return { error: '수주 등록은 영업 부문만 할 수 있습니다.' }
  const file = f.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'PDF 파일을 선택하세요.' }
  if (file.size > MAX_FILE) return { error: '파일은 4MB 이하만 가능합니다.' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isPdf(bytes)) return { error: 'PDF 파일만 가능합니다.' }
  try {
    const r = await pdfToRedactedText(bytes)
    if (!r) return { error: '글자를 읽을 수 없는 스캔 PDF입니다. 금액 마스킹을 보장할 수 없어 AI로 보내지 않습니다. 직접 입력해 주세요.' }
    return r
  } catch {
    return { error: 'PDF를 읽지 못했습니다. (암호가 걸렸거나 손상된 파일)' }
  }
}

// 이미지 자동입력: 이미지 전체를 Claude 비전으로 전송(픽셀은 사전 마스킹 불가 — 클라이언트에서 동의 받음) → 필드 추출
export async function runImageAutofill(f: FormData): Promise<ExtractedFields | { error: string }> {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!isSales(u, depts)) return { error: '수주 등록은 영업 부문만 할 수 있습니다.' }
  const file = f.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: '이미지를 선택하세요.' }
  if (file.size > MAX_FILE) return { error: '이미지는 4MB 이하만 가능합니다.' }
  if (!isSupportedImage(file.type)) return { error: 'PNG·JPG·WEBP·GIF 이미지만 가능합니다.' }
  try {
    return await extractFieldsFromImage(new Uint8Array(await file.arrayBuffer()), file.type)
  } catch (e) {
    console.error('image autofill failed:', (e as Error).name)
    return { error: e instanceof Error && /[가-힣]/.test(e.message) ? e.message : 'AI 분석에 실패했습니다. 잠시 후 다시 시도하거나 직접 입력하세요.' }
  }
}

// AI 자동입력 2단계: 사용자가 확인한 마스킹 텍스트만 Claude로 전송 → 필드 추출
export async function runAutofill(text: string): Promise<ExtractedFields | { error: string }> {
  const [u, depts] = await Promise.all([requireMe(), teamDepts()])
  if (!isSales(u, depts)) return { error: '수주 등록은 영업 부문만 할 수 있습니다.' }
  if (!text.trim() || text.length > 100_000) return { error: '보낼 내용이 비어 있거나 너무 깁니다.' }
  try {
    return await extractFields(text)
  } catch (e) {
    console.error('autofill failed:', (e as Error).name) // 문서 내용은 로그에 남기지 않음
    return { error: e instanceof Error && /[가-힣]/.test(e.message) ? e.message : 'AI 분석에 실패했습니다. 잠시 후 다시 시도하거나 직접 입력하세요.' }
  }
}
