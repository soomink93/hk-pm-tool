-- ERP 기준정보: Customer를 거래처 마스터로 확장 + 품목(Material)·BOM + Order 품목 FK
-- 전부 추가형. 기존 Customer/Order 데이터 보존(새 컬럼은 DEFAULT/nullable).

-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('customer', 'supplier', 'both');
CREATE TYPE "MaterialType" AS ENUM ('FG', 'SEMI', 'RAW', 'PART', 'MERCH');

-- AlterTable: Customer → ERP 거래처 필드
ALTER TABLE "Customer" ADD COLUMN "code" TEXT;
ALTER TABLE "Customer" ADD COLUMN "role" "PartnerRole" NOT NULL DEFAULT 'customer';
ALTER TABLE "Customer" ADD COLUMN "bizRegNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "ceo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "bizType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "bizItem" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'KR';
ALTER TABLE "Customer" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';
ALTER TABLE "Customer" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "paymentTerms" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Customer" ADD COLUMN "memo" TEXT NOT NULL DEFAULT '';

-- CreateTable: CustomerContact
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Material
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL DEFAULT 'PART',
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "manageStock" BOOLEAN NOT NULL DEFAULT true,
    "manageLot" BOOLEAN NOT NULL DEFAULT false,
    "modelBase" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Bom
CREATE TABLE "Bom" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "seq" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Order 품목 FK (nullable)
ALTER TABLE "Order" ADD COLUMN "materialId" TEXT;

-- Indexes
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_role_active_idx" ON "Customer"("role", "active");
-- 국내 거래처 사업자번호 중복 방지(빈값 제외)
CREATE UNIQUE INDEX "Customer_bizRegNo_key" ON "Customer"("bizRegNo") WHERE "bizRegNo" <> '';
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");
CREATE INDEX "Material_type_active_idx" ON "Material"("type", "active");
CREATE UNIQUE INDEX "Bom_parentId_childId_key" ON "Bom"("parentId", "childId");
CREATE INDEX "Bom_parentId_idx" ON "Bom"("parentId");
CREATE INDEX "Order_materialId_idx" ON "Order"("materialId");

-- Foreign Keys
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
