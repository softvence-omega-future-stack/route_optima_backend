/*
  Warnings:

  - A unique constraint covering the columns `[dispatcherId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "dispatcherId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dispatcherId" TEXT;

-- CreateTable
CREATE TABLE "Dispatcher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "photo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispatcher_phone_key" ON "Dispatcher"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_dispatcherId_key" ON "User"("dispatcherId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
