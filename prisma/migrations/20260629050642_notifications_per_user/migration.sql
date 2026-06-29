/*
  Warnings:

  - You are about to drop the column `recipientTeam` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `recipientUserId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toTeam` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Notification_recipientTeam_read_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "recipientTeam",
ADD COLUMN     "recipientUserId" TEXT NOT NULL,
ADD COLUMN     "toTeam" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_read_idx" ON "Notification"("recipientUserId", "read");
