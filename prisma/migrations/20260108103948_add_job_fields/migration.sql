-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CHIMNEY_SWEEP', 'LOCKSMITH', 'DRYER_VENT_CLEANING');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "jobSource" TEXT,
ADD COLUMN     "jobType" "JobType";
