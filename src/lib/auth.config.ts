import type { NextAuthConfig } from 'next-auth'

// 엣지 안전한 기본 설정 (DB/providers 없음) — 미들웨어와 auth.ts가 공유
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isAuthed = !!auth?.user
      const onLogin = request.nextUrl.pathname.startsWith('/login')
      if (onLogin) {
        if (isAuthed) return Response.redirect(new URL('/overview', request.nextUrl))
        return true
      }
      return isAuthed
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.role = (user as { role?: string }).role
        token.team = (user as { team?: string }).team
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? ''
        session.user.role = token.role as 'chairman' | 'executive' | 'teamlead'
        session.user.team = (token.team as string) ?? ''
      }
      return session
    },
  },
} satisfies NextAuthConfig
