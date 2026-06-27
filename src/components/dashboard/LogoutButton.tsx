'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: '/login' })}
      className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
    >
      <LogOut size={14} />
      로그아웃
    </button>
  )
}
