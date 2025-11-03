/*
  Warnings:

  - Added the required column `date` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `technicianId` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isBooked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "technicianId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoURL" TEXT;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
