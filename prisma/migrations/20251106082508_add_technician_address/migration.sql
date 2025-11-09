/*
  Warnings:

  - You are about to drop the column `region` on the `Technician` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Technician" DROP COLUMN "region",
ADD COLUMN     "address" TEXT;
