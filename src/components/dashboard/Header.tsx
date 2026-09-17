import { Building2 } from 'lucide-react'
import type { Role } from '@/lib/rbac'
import { LogoutButton } from './LogoutButton'
import { NotificationBell } from './NotificationBell'
import { GlobalSearch } from './GlobalSearch'

const ROLE_LABEL: Record<Role, string> = {
  admin: '관리자',
  chairman: '회장님',
  president: '사장',
  executive: '임원',
  teamlead: '팀장',
}

const ROLE_CHIP: Record<Role, string> = {
  admin: 'bg-rose-600 text-white',
  chairman: 'bg-amber-300 text-slate-900',
  president: 'bg-purple-600 text-white',
  executive: 'bg-green-600 text-white',
  teamlead: 'bg-navy-light text-white',
}

export function Header({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex items-center gap-4 bg-navy px-6 py-3.5 text-white">
      <div className="flex shrink-0 items-center gap-2">
        <Building2 size={18} />
        <h1 className="whitespace-nowrap text-base font-bold">HK 운영 대시보드</h1>
      </div>
      <div className="hidden flex-1 justify-center md:flex">
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center gap-3 ml-auto md:ml-0">
        <NotificationBell />
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_CHIP[role]}`}>
          {ROLE_LABEL[role]}
        </span>
        <span className="rounded-full bg-navy-light px-3 py-1 text-xs font-semibold">{name}</span>
        <LogoutButton />
      </div>
    </header>
  )
}
