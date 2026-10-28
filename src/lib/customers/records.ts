// 고객사 공용 기록 — 수주 화면 등에서 고객사 이름으로 조회·추가 (Customer는 첫 기록 때 생성)
import { prisma } from '../prisma'
import { getCrm } from './crm'
import { customerKey } from './key'

export async function customerRecords(name: string) {
  const key = customerKey(name)
  if (!key) return null
  return prisma.customer.findUnique({ where: { key }, include: { notes: { orderBy: { createdAt: 'desc' } } } })
}

export async function addCustomerNote(name: string, note: { text: string; actor: string; orderId?: string }) {
  const key = customerKey(name)
  if (!key) throw new Error('고객사 이름이 비어 있습니다.')
  const customer = await prisma.customer.upsert({ where: { key }, create: { key, name: name.trim() }, update: {} })
  const created = await prisma.customerNote.create({ data: { customerId: customer.id, ...note } })
  await syncNoteToCrm(customer, created).catch((e) => console.error('crm sync failed:', (e as Error).name))
  return created
}

// CRM 어댑터가 있으면 회사 매핑(최초 1회) 후 노트 전송
async function syncNoteToCrm(
  customer: { id: string; name: string; crmSource: string | null; crmId: string | null },
  note: { id: string; text: string; actor: string; createdAt: Date },
) {
  const crm = getCrm()
  if (!crm) return
  let crmId = customer.crmSource === crm.source ? customer.crmId : null
  if (!crmId) {
    crmId = await crm.findCompany(customer.name)
    if (!crmId) return
    await prisma.customer.update({ where: { id: customer.id }, data: { crmSource: crm.source, crmId } })
  }
  const noteId = await crm.pushNote(crmId, note)
  await prisma.$transaction([
    prisma.customerNote.update({ where: { id: note.id }, data: { crmId: noteId } }),
    prisma.customer.update({ where: { id: customer.id }, data: { crmSyncedAt: new Date() } }),
  ])
}
