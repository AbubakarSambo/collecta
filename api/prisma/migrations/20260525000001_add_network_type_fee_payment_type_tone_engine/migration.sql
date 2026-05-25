-- CreateEnum
CREATE TYPE "NetworkType" AS ENUM ('ESTATE', 'CHAMA', 'SUPPLIER', 'DEBT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeePaymentType" AS ENUM ('SCHEDULED', 'OPEN', 'WINDOWED');

-- CreateEnum
CREATE TYPE "ReminderTone" AS ENUM ('FRIENDLY', 'CLEAR', 'FIRM', 'FORMAL');

-- AlterTable: Network
ALTER TABLE "Network"
  ADD COLUMN "networkType"          "NetworkType"        NOT NULL DEFAULT 'ESTATE',
  ADD COLUMN "verificationStatus"   "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "isVerified"           BOOLEAN              NOT NULL DEFAULT false,
  ADD COLUMN "verificationNotes"    TEXT,
  ADD COLUMN "smsCredits"           INTEGER              NOT NULL DEFAULT 0,
  ADD COLUMN "smsWarningLastSentAt" TIMESTAMP(3),
  ADD COLUMN "brandColor"           TEXT                 DEFAULT '#F5C842',
  ADD COLUMN "contactPhone"         TEXT;

-- AlterTable: Fee
ALTER TABLE "Fee"
  ADD COLUMN "paymentType"  "FeePaymentType" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "windowStart"  TIMESTAMP(3),
  ADD COLUMN "windowEnd"    TIMESTAMP(3);

-- AlterTable: Charge
ALTER TABLE "Charge"
  ADD COLUMN "serviceCharge"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "billingMonth"   TEXT;

-- AlterTable: Payment
ALTER TABLE "Payment"
  ADD COLUMN "serviceCharge"  DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Add unique constraint on Payment.paystackReference (was not previously constrained)
CREATE UNIQUE INDEX "Payment_paystackReference_key" ON "Payment"("paystackReference") WHERE "paystackReference" IS NOT NULL;

-- AlterTable: Member
ALTER TABLE "Member"
  ADD COLUMN "consecutiveMonthsPaid" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isBlacklisted"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blacklistReason"       TEXT;

-- CreateTable: ReminderLog
CREATE TABLE "ReminderLog" (
    "id"           TEXT         NOT NULL,
    "networkId"    TEXT         NOT NULL,
    "memberId"     TEXT         NOT NULL,
    "assignmentId" TEXT,
    "chargeId"     TEXT,
    "channel"      "ReminderChannel" NOT NULL,
    "tone"         "ReminderTone"    NOT NULL,
    "sentDate"     TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ReminderLog unique deduplication
CREATE UNIQUE INDEX "ReminderLog_assignmentId_sentDate_channel_key" ON "ReminderLog"("assignmentId", "sentDate", "channel");

-- AddForeignKey: ReminderLog → Network
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_networkId_fkey"
  FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ReminderLog → Member
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ReminderLog → FeeAssignment
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "FeeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
