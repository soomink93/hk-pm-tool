-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "collaborationId" TEXT;

-- CreateIndex
CREATE INDEX "Task_collaborationId_idx" ON "Task"("collaborationId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
