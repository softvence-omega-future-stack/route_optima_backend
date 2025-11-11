-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_technicianId_fkey";

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;
