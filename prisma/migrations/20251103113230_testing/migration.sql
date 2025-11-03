/*
  Warnings:

  - You are about to drop the column `photoURL` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Technician" ADD COLUMN     "photo" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "photoURL",
ADD COLUMN     "photo" TEXT;
