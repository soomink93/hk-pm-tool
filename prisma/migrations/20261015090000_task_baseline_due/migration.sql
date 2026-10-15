-- AlterTable
ALTER TABLE "Task" ADD COLUMN "baselineDue" TEXT;

-- 기존 작업은 현재 마감을 최초 계획으로 간주(밀림 0에서 시작)
UPDATE "Task" SET "baselineDue" = "dueDate" WHERE "dueDate" <> '';
