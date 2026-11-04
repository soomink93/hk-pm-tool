import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { teamDepts } from '@/lib/orders/session'
import { canEditPartner, canEditMaterial, canEditBom } from '@/lib/erp/perm'
import { MasterPartners, type Partner } from '@/components/dashboard/MasterPartners'
import { MasterMaterials, type Material } from '@/components/dashboard/MasterMaterials'
import { MasterBom, type BomRow } from '@/components/dashboard/MasterBom'

export const dynamic = 'force-dynamic'

const SEGMENTS = [
  { id: 'partners', label: '거래처' },
  { id: 'materials', label: '품목/모델' },
  { id: 'bom', label: 'BOM' },
] as const

export default async function MasterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const s = await auth()
  if (!s?.user?.id) redirect('/login')
  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { id: true, name: true, role: true, team: true, department: true },
  })
  if (!me) redirect('/login')

  const sp = await searchParams
  const tab = SEGMENTS.some((x) => x.id === sp.tab) ? sp.tab! : 'partners'
  const depts = await teamDepts()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-bold text-navy">기준정보</h1>
      <p className="mb-4 text-[13px] text-slate-500">거래처 · 품목/모델 · BOM 마스터</p>

      <div className="mb-5 flex gap-1 border-b border-line">
        {SEGMENTS.map((seg) => {
          const active = tab === seg.id
          return (
            <Link
              key={seg.id}
              href={`/master?tab=${seg.id}`}
              className={`border-b-2 px-4 py-2 text-[13px] font-semibold transition ${active ? 'border-navy-light text-navy' : 'border-transparent text-slate-400 hover:text-navy'}`}
            >
              {seg.label}
            </Link>
          )
        })}
      </div>

      {tab === 'partners' && <PartnersSegment canEdit={canEditPartner(me, depts)} />}
      {tab === 'materials' && <MaterialsSegment canEdit={canEditMaterial(me, depts)} />}
      {tab === 'bom' && <BomSegment canEdit={canEditBom(me, depts)} />}
    </div>
  )
}

async function PartnersSegment({ canEdit }: { canEdit: boolean }) {
  const rows = await prisma.customer.findMany({
    where: { active: true },
    include: { contacts: true },
    orderBy: { createdAt: 'desc' },
  })
  const partners: Partner[] = rows.map((r) => ({
    id: r.id, code: r.code, name: r.name, role: r.role, bizRegNo: r.bizRegNo, ceo: r.ceo,
    bizType: r.bizType, bizItem: r.bizItem, country: r.country, currency: r.currency,
    address: r.address, paymentTerms: r.paymentTerms, memo: r.memo, active: r.active,
    contacts: r.contacts.map((c) => ({ name: c.name, title: c.title, phone: c.phone, email: c.email, isPrimary: c.isPrimary })),
  }))
  return <MasterPartners partners={partners} canEdit={canEdit} />
}

async function MaterialsSegment({ canEdit }: { canEdit: boolean }) {
  const rows = await prisma.material.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } })
  const materials: Material[] = rows.map((m) => ({
    id: m.id, code: m.code, name: m.name, type: m.type, uom: m.uom,
    manageStock: m.manageStock, manageLot: m.manageLot, modelBase: m.modelBase, size: m.size, memo: m.memo,
  }))
  return <MasterMaterials materials={materials} canEdit={canEdit} />
}

async function BomSegment({ canEdit }: { canEdit: boolean }) {
  const [mats, bomRows] = await Promise.all([
    prisma.material.findMany({ where: { active: true }, select: { id: true, code: true, name: true, type: true }, orderBy: { name: 'asc' } }),
    prisma.bom.findMany({ select: { id: true, parentId: true, childId: true, qty: true, uom: true } }),
  ])
  const bom: BomRow[] = bomRows
  return <MasterBom materials={mats} bom={bom} canEdit={canEdit} />
}
