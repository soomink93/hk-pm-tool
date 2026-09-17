-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'president';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "department" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT;
