/*
  Warnings:

  - You are about to drop the column `state` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `TimeSlot` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `customerPhone` on table `Job` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jobDescription` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_timeSlotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TimeSlot" DROP CONSTRAINT "TimeSlot_technicianId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "state",
ALTER COLUMN "customerPhone" SET NOT NULL,
ALTER COLUMN "jobDescription" SET NOT NULL;

-- DropTable
DROP TABLE "public"."TimeSlot";

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "defaultTimeSlotId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sendCustomerEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendTechnicianSMS" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_date_defaultTimeSlotId_technicianId_key" ON "Booking"("date", "defaultTimeSlotId", "technicianId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_defaultTimeSlotId_fkey" FOREIGN KEY ("defaultTimeSlotId") REFERENCES "DefaultTimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "DefaultTimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
