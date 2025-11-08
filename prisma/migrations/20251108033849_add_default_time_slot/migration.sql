-- CreateTable
CREATE TABLE "DefaultTimeSlot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "order" SERIAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefaultTimeSlot_isActive_order_idx" ON "DefaultTimeSlot"("isActive", "order");
