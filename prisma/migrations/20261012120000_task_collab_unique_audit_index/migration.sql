-- Task.collaborationId: index → unique (협업당 작업 1개 보장, 수락 race 방지)
DROP INDEX IF EXISTS "Task_collaborationId_idx";
CREATE UNIQUE INDEX "Task_collaborationId_key" ON "Task"("collaborationId");

-- AuditLog: 항목별 이력 조회용 복합 인덱스
DROP INDEX IF EXISTS "AuditLog_entity_idx";
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
