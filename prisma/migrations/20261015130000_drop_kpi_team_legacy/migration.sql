-- 구 KPI/주간보고 잔재 제거
ALTER TABLE "Team" DROP COLUMN "submitted";
ALTER TABLE "Team" DROP COLUMN "risk";
ALTER TABLE "Team" DROP COLUMN "escalation";
DROP TABLE "Kpi";
