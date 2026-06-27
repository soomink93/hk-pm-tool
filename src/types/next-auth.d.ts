import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      team: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    role?: Role
    team?: string
  }
}
