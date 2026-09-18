import type { Session } from 'next-auth'
import { prisma } from './prisma'

export type AuditAction = 'create' | 'update' | 'delete' | 'status'

// 변경 이력 기록 (실패해도 본 작업에 영향 없음)
export async function logAudit(
  session: Session,
  action: AuditAction,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name ?? '',
        action,
        entity,
        entityId,
        summary,
      },
    })
  } catch {
    /* 감사 로그 실패는 무시 */
  }
}
