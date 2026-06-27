'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  CheckSquare,
  TriangleAlert,
  Settings,
} from 'lucide-react'
import { TABS } from '@/lib/constants'
import type { Role } from '@/lib/rbac'

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  overview: LayoutDashboard,
  brief: FileText,
  kpi: BarChart3,
  decisions: CheckSquare,
  escalation: TriangleAlert,
  settings: Settings,
}

export function TabNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const tabs = TABS.filter((t) => (t.roles as readonly string[]).includes(role))

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-white px-6">
      {tabs.map((t) => {
        const href = `/${t.id}`
        const active = pathname === href || pathname.startsWith(href + '/')
        const Icon = ICONS[t.id]
        return (
          <Link
            key={t.id}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-semibold transition ${
              active
                ? 'border-navy-light text-navy'
                : 'border-transparent text-slate-400 hover:text-navy'
            }`}
          >
            {Icon && <Icon size={15} />}
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
