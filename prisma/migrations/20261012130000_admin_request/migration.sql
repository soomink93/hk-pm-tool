-- CreateTable
CREATE TABLE "AdminRequest" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '대기중',
    "reply" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRequest_createdById_idx" ON "AdminRequest"("createdById");
