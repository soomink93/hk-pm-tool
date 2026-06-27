import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const email = String(c.email ?? '').trim().toLowerCase()
        const password = String(c.password ?? '')
        if (!email || !password) return null
        const u = await prisma.user.findUnique({ where: { email } })
        if (!u || !bcrypt.compareSync(password, u.passwordHash)) return null
        return { id: u.id, name: u.name, email: u.email, role: u.role, team: u.team ?? '' }
      },
    }),
  ],
})
