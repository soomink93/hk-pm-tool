import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'

export const { auth: proxy } = NextAuth(authConfig)

export default proxy

// /api 는 각 라우트 핸들러에서 자체 인증·권한 검사 (401/403)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
