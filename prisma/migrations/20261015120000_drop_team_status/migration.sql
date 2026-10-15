-- 팀 상태(신호등) 제거
ALTER TABLE "Team" DROP COLUMN "status";
DROP TYPE "TeamStatus";
