import Link from 'next/link'

// 수주 탭 하위 메뉴 (현황 · 등록 · 완료 기록)
export function OrdersNav({ active, canCreate }: { active: 'list' | 'new' | 'archive'; canCreate: boolean }) {
  const items = [
    { id: 'list', href: '/orders', label: '수주 현황' },
    ...(canCreate ? [{ id: 'new', href: '/orders/new', label: '+ 수주 등록' }] : []),
    { id: 'archive', href: '/orders/archive', label: '완료 기록' },
  ]
  return (
    <div className="no-print flex gap-1">
      {items.map((i) => (
        <Link key={i.id} href={i.href} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${active === i.id ? 'bg-navy text-white' : 'bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50'}`}>
          {i.label}
        </Link>
      ))}
    </div>
  )
}
