/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Session` table. All the data in the column will be lost.
  - Changed the type of `startTime` on the `TimeSlot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `TimeSlot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "public"."Session_userId_key";

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "scheduledDate" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "accessToken",
ALTER COLUMN "isActive" SET DEFAULT true;

-- AlterTable
ALTER TABLE "TimeSlot" DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;
