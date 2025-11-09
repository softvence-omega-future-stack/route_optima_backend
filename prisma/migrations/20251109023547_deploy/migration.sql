/*
  Warnings:

  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_defaultTimeSlotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_jobId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_technicianId_fkey";

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'ASSIGNED';

-- DropTable
DROP TABLE "public"."Booking";
