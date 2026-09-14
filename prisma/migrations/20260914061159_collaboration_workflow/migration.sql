-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('requested', 'accepted', 'in_progress', 'done', 'declined');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "href" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'request';

-- CreateTable
CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL,
    "fromTeam" TEXT NOT NULL,
    "toTeam" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CollabStatus" NOT NULL DEFAULT 'requested',
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationComment" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborationComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collaboration_toTeam_status_idx" ON "Collaboration"("toTeam", "status");

-- CreateIndex
CREATE INDEX "Collaboration_fromTeam_status_idx" ON "Collaboration"("fromTeam", "status");

-- CreateIndex
CREATE INDEX "CollaborationComment_collaborationId_idx" ON "CollaborationComment"("collaborationId");

-- AddForeignKey
ALTER TABLE "CollaborationComment" ADD CONSTRAINT "CollaborationComment_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
