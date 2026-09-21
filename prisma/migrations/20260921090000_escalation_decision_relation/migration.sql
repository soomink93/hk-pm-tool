-- Decision.escalationId 1:1 관계 (Escalation) + 유니크
CREATE UNIQUE INDEX "Decision_escalationId_key" ON "Decision"("escalationId");

ALTER TABLE "Decision" ADD CONSTRAINT "Decision_escalationId_fkey"
  FOREIGN KEY ("escalationId") REFERENCES "Escalation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
