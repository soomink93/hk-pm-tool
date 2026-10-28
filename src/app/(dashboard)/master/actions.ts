'use server'

import { revalidatePath } from 'next/cache'
import type { PartnerRole, MaterialType } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { teamDepts } from '@/lib/orders/session'
import { canEditPartner, canEditMaterial, canEditBom } from '@/lib/erp/perm'
import { nextPartnerCode, nextMaterialCode } from '@/lib/erp/code'
import { wouldCycle } from '@/lib/erp/bom'
import { customerKey } from '@/lib/customers/key'

// 유니크 충돌이 'code' 때문인지 (재채번 재시도 판단용)
const isCodeConflict = (e: unknown) =>
  (e as { code?: string })?.code === 'P2002' && String((e as { meta?: { target?: unknown } })?.meta?.target ?? '').includes('code')
const usedPartnerCodes = async () =>
  (await prisma.customer.findMany({ where: { code: { not: null } }, select: { code: true } })).map((c) => c.code!).filter(Boolean)
const usedMaterialCodes = async () =>
  (await prisma.material.findMany({ select: { code: true } })).map((m) => m.code)

type Contact = { name: string; title: string; phone: string; email: string; isPrimary: boolean }

// 로그인 사용자(권한 판정용) + 세션 반환
async function actor() {
  const s = await auth()
  if (!s?.user?.id) return null
  const u = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { id: true, name: true, role: true, team: true, department: true },
  })
  return u ? { s, u } : null
}

function parseContacts(raw: FormDataEntryValue | null): Contact[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const arr = JSON.parse(raw) as Contact[]
    return arr.filter((c) => c.name?.trim()).map((c) => ({
      name: c.name.trim(), title: c.title ?? '', phone: c.phone ?? '', email: c.email ?? '', isPrimary: !!c.isPrimary,
    }))
  } catch {
    return []
  }
}

function fields(f: FormData) {
  const role = (String(f.get('role') || 'customer')) as PartnerRole
  return {
    name: String(f.get('name') || '').trim(),
    role,
    code: String(f.get('code') || '').trim(),
    bizRegNo: String(f.get('bizRegNo') || '').trim(),
    ceo: String(f.get('ceo') || '').trim(),
    bizType: String(f.get('bizType') || '').trim(),
    bizItem: String(f.get('bizItem') || '').trim(),
    country: String(f.get('country') || 'KR').trim(),
    currency: String(f.get('currency') || 'KRW').trim(),
    address: String(f.get('address') || '').trim(),
    paymentTerms: String(f.get('paymentTerms') || '').trim(),
    memo: String(f.get('memo') || '').trim(),
    contacts: parseContacts(f.get('contacts')),
  }
}

export async function createPartner(_prev: { error: string; ok?: boolean }, f: FormData): Promise<{ error: string; ok?: boolean }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditPartner(a.u, depts)) return { error: '거래처 등록 권한이 없습니다. (영업 부문)' }

  const d = fields(f)
  if (!d.name) return { error: '거래처명을 입력하세요.' }
  const key = customerKey(d.name)
  if (!key) return { error: '거래처명이 비어 있습니다.' }

  const exists = await prisma.customer.findUnique({ where: { key }, select: { id: true } })
  if (exists) return { error: '이미 등록된 고객사입니다. 목록에서 수정하세요.' }

  const autoCode = !d.code
  let code = d.code || nextPartnerCode(d.role, await usedPartnerCodes())
  const { contacts, ...rest } = d
  for (let attempt = 0; ; attempt++) {
    try {
      const created = await prisma.customer.create({ data: { key, ...rest, code, contacts: { create: contacts } } })
      await logAudit(a.s, 'create', 'Customer', created.id, `거래처 등록: ${d.name} (${code})`)
      break
    } catch (e) {
      if (autoCode && isCodeConflict(e) && attempt < 1) { code = nextPartnerCode(d.role, await usedPartnerCodes()); continue } // 동시 채번 충돌 → 재채번 1회
      return { error: '등록 실패 — 코드 또는 사업자번호가 중복일 수 있습니다.' }
    }
  }
  revalidatePath('/master')
  return { error: '', ok: true }
}

export async function updatePartner(_prev: { error: string; ok?: boolean }, f: FormData): Promise<{ error: string; ok?: boolean }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditPartner(a.u, depts)) return { error: '거래처 수정 권한이 없습니다.' }

  const id = String(f.get('id') || '')
  if (!id) return { error: '대상이 없습니다.' }
  const d = fields(f)
  if (!d.name) return { error: '거래처명을 입력하세요.' }
  // key(이름 정규화)는 기존 수주↔고객 조인키라 수정하지 않음(이름 바꿔도 연결 유지). 표시 이름만 갱신.

  try {
    const { contacts, ...rest } = d
    await prisma.$transaction([
      prisma.customerContact.deleteMany({ where: { customerId: id } }),
      prisma.customer.update({
        where: { id },
        data: { ...rest, code: d.code || undefined, contacts: { create: contacts } },
      }),
    ])
    await logAudit(a.s, 'update', 'Customer', id, `거래처 수정: ${d.name}`)
  } catch {
    return { error: '수정 실패 — 코드/사업자번호 중복일 수 있습니다.' }
  }
  revalidatePath('/master')
  return { error: '', ok: true }
}

export async function deactivatePartner(id: string): Promise<{ error: string }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditPartner(a.u, depts)) return { error: '권한이 없습니다.' }
  await prisma.customer.update({ where: { id }, data: { active: false } })
  await logAudit(a.s, 'update', 'Customer', id, '거래처 비활성(사용여부 off)')
  revalidatePath('/master')
  return { error: '' }
}

// ───────── 품목/모델 ─────────

function materialFields(f: FormData) {
  const type = (String(f.get('type') || 'PART')) as MaterialType
  return {
    name: String(f.get('name') || '').trim(),
    type,
    code: String(f.get('code') || '').trim(),
    uom: String(f.get('uom') || 'EA').trim() || 'EA',
    manageStock: f.get('manageStock') === 'on',
    manageLot: f.get('manageLot') === 'on',
    modelBase: type === 'FG' ? String(f.get('modelBase') || '').trim() : '',
    size: type === 'FG' ? String(f.get('size') || '').trim() : '',
    memo: String(f.get('memo') || '').trim(),
  }
}

export async function createMaterial(_prev: { error: string; ok?: boolean }, f: FormData): Promise<{ error: string; ok?: boolean }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditMaterial(a.u, depts)) return { error: '품목 등록 권한이 없습니다. (생산·연구 부문)' }

  const d = materialFields(f)
  if (!d.name) return { error: '품목명을 입력하세요.' }

  const autoCode = !d.code
  let code = d.code || nextMaterialCode(d.type, await usedMaterialCodes())
  for (let attempt = 0; ; attempt++) {
    try {
      const created = await prisma.material.create({ data: { ...d, code, createdBy: a.u.name } })
      await logAudit(a.s, 'create', 'Material', created.id, `품목 등록: ${d.name} (${code})`)
      break
    } catch (e) {
      if (autoCode && isCodeConflict(e) && attempt < 1) { code = nextMaterialCode(d.type, await usedMaterialCodes()); continue }
      return { error: '등록 실패 — 품목코드가 중복일 수 있습니다.' }
    }
  }
  revalidatePath('/master')
  return { error: '', ok: true }
}

export async function updateMaterial(_prev: { error: string; ok?: boolean }, f: FormData): Promise<{ error: string; ok?: boolean }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditMaterial(a.u, depts)) return { error: '품목 수정 권한이 없습니다.' }
  const id = String(f.get('id') || '')
  if (!id) return { error: '대상이 없습니다.' }
  const d = materialFields(f)
  if (!d.name) return { error: '품목명을 입력하세요.' }
  try {
    await prisma.material.update({ where: { id }, data: { ...d, code: d.code || undefined } })
    await logAudit(a.s, 'update', 'Material', id, `품목 수정: ${d.name}`)
  } catch {
    return { error: '수정 실패 — 품목코드가 중복일 수 있습니다.' }
  }
  revalidatePath('/master')
  return { error: '', ok: true }
}

export async function deactivateMaterial(id: string): Promise<{ error: string }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditMaterial(a.u, depts)) return { error: '권한이 없습니다.' }
  await prisma.material.update({ where: { id }, data: { active: false } })
  await logAudit(a.s, 'update', 'Material', id, '품목 비활성(사용여부 off)')
  revalidatePath('/master')
  return { error: '' }
}

// ───────── BOM ─────────

export async function addBomLine(parentId: string, childId: string, qty: number, uom: string): Promise<{ error: string }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditBom(a.u, depts)) return { error: 'BOM 편집 권한이 없습니다. (연구 부문)' }
  if (!parentId || !childId) return { error: '상위·하위 품목을 선택하세요.' }
  if (parentId === childId) return { error: '자기 자신을 하위로 넣을 수 없습니다.' }
  if (!(qty > 0)) return { error: '소요량은 0보다 커야 합니다.' }
  const lines = await prisma.bom.findMany({ select: { parentId: true, childId: true, qty: true } })
  if (wouldCycle(parentId, childId, lines)) return { error: '순환 BOM이 됩니다 — 이 하위 품목이 이미 상위 품목을 포함합니다.' }
  try {
    await prisma.bom.create({ data: { parentId, childId, qty, uom: uom || 'EA', createdBy: a.u.name } })
    await logAudit(a.s, 'create', 'Bom', parentId, `BOM 추가: ${childId} x${qty}`)
  } catch {
    return { error: '추가 실패 — 이미 등록된 하위 품목일 수 있습니다.' }
  }
  revalidatePath('/master')
  return { error: '' }
}

export async function deleteBomLine(id: string): Promise<{ error: string }> {
  const a = await actor()
  if (!a) return { error: '로그인이 필요합니다.' }
  const depts = await teamDepts()
  if (!canEditBom(a.u, depts)) return { error: '권한이 없습니다.' }
  await prisma.bom.delete({ where: { id } })
  await logAudit(a.s, 'delete', 'Bom', id, 'BOM 라인 삭제')
  revalidatePath('/master')
  return { error: '' }
}
