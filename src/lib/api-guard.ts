import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from './auth'
import { can, type Action } from './rbac'

type GuardOk = { session: Session; res?: never }
type GuardFail = { session?: never; res: NextResponse }

// 라우트 핸들러 공용 가드: 인증(401) + 선택적 권한(403)
export async function guard(action?: Action): Promise<GuardOk | GuardFail> {
  const session = await auth()
  if (!session?.user) {
    return { res: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) }
  }
  if (action && !can(session.user.role, action)) {
    return { res: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) }
  }
  return { session }
}
