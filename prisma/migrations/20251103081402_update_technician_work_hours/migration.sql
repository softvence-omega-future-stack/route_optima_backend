/*
  Warnings:

  - You are about to drop the column `workHours` on the `Technician` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Technician" DROP COLUMN "workHours",
ADD COLUMN     "workEndTime" TIMESTAMP(3),
ADD COLUMN     "workStartTime" TIMESTAMP(3);
