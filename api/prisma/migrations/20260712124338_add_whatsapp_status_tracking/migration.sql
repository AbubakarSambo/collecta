-- CreateEnum
CREATE TYPE "WhatsappDeliveryStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "whatsappOptedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOptedInAt" TIMESTAMP(3),
ADD COLUMN     "whatsappOptedOutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "whatsappStatus" "WhatsappDeliveryStatus",
ADD COLUMN     "whatsappStatusAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "whatsappStatus" "WhatsappDeliveryStatus",
ADD COLUMN     "whatsappStatusAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WhatsappStatusEvent" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "status" "WhatsappDeliveryStatus" NOT NULL,
    "recipientPhone" TEXT,
    "errorCode" INTEGER,
    "errorTitle" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappStatusEvent_providerMessageId_status_key" ON "WhatsappStatusEvent"("providerMessageId", "status");

-- CreateIndex
CREATE INDEX "Reminder_providerMessageId_idx" ON "Reminder"("providerMessageId");

-- CreateIndex
CREATE INDEX "ReminderLog_providerMessageId_idx" ON "ReminderLog"("providerMessageId");
