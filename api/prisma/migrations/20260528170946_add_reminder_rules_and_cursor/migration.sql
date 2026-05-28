/*
  Warnings:

  - A unique constraint covering the columns `[paystackReference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "smsOptedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsOptedOutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Network" ADD COLUMN     "lastProcessedId" TEXT,
ADD COLUMN     "lastRunAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL,
    "cacNumber" TEXT,
    "bvn" TEXT,
    "nin" TEXT,
    "contactAddress" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "rawData" JSONB,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderRule" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "daysOffset" INTEGER NOT NULL,
    "channels" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_networkId_key" ON "VerificationRequest"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderRule_networkId_daysOffset_key" ON "ReminderRule"("networkId", "daysOffset");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paystackReference_key" ON "Payment"("paystackReference");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
