'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  TriangleAlert,
  Settings,
  Handshake,
  KanbanSquare,
  History,
  ListChecks,
  Mail,
  FolderKanban,
  Gauge,
  GanttChartSquare,
  Factory,
  Inbox,
  CalendarDays,
  Users,
  Boxes,
} from 'lucide-react'
import { TABS } from '@/lib/constants'
import { buildNav } from '@/lib/nav'
import type { Role } from '@/lib/rbac'

// route id → 아이콘 (하위탭·단일그룹용)
const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  calendar: CalendarDays,
  overview: LayoutDashboard,
  members: Users,
  projects: FolderKanban,
  roadmap: GanttChartSquare,
  master: Boxes,
  orders: Factory,
  workload: Gauge,
  weekly: Mail,
  'my-tasks': ListChecks,
  collaboration: Handshake,
  tasks: KanbanSquare,
  decisions: CheckSquare,
  escalation: TriangleAlert,
  requests: Inbox,
  audit: History,
  settings: Settings,
}
// 여러 항목을 묶은 그룹의 대표 아이콘 (그룹 라벨 기준)
const GROUP_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  프로젝트: FolderKanban,
  작업: ListChecks,
  결정: CheckSquare,
  관리: Settings,
}

export function TabNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const allowedIds = TABS.filter((t) => (t.roles as readonly string[]).includes(role)).map((t) => t.id)
  const { groups, sub } = buildNav(allowedIds, pathname)
  const matches = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="border-b border-line bg-white print:hidden">
      <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6">
        {groups.map((g) => {
          const Icon = GROUP_ICON[g.label] ?? ICONS[g.items[0].id]
          return (
            <Link
              key={g.label}
              href={g.href}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-semibold transition ${
                g.active ? 'border-navy-light text-navy' : 'border-transparent text-slate-400 hover:text-navy'
              }`}
            >
              {Icon && <Icon size={15} />}
              {g.label}
            </Link>
          )
        })}
      </nav>
      {sub.length > 0 && (
        <nav className="flex gap-1 overflow-x-auto bg-slate-50 px-4 sm:px-6">
          {sub.map((it) => {
            const active = matches(it.href)
            return (
              <Link
                key={it.id}
                href={it.href}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-semibold transition ${
                  active ? 'border-navy-light text-navy' : 'border-transparent text-slate-500 hover:text-navy'
                }`}
              >
                {it.label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
