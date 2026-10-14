-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('active', 'hold', 'done');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('undecided', 'mass', 'custom', 'oem');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('todo', 'doing', 'done', 'skip');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL DEFAULT '',
    "customer" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "specialTerms" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "productType" "ProductType" NOT NULL DEFAULT 'undecided',
    "status" "OrderStatus" NOT NULL DEFAULT 'active',
    "completedAt" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "assignee" TEXT NOT NULL DEFAULT '',
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "baseStart" TEXT NOT NULL,
    "baseEnd" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'todo',
    "startedAt" TEXT,
    "doneAt" TEXT,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFile" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_orderId_seq_key" ON "Stage"("orderId", "seq");

-- CreateIndex
CREATE INDEX "OrderLog_orderId_createdAt_idx" ON "OrderLog"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLog" ADD CONSTRAINT "OrderLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFile" ADD CONSTRAINT "OrderFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

