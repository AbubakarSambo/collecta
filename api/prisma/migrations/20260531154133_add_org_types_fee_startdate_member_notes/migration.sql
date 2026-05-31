-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NetworkType" ADD VALUE 'GYM';
ALTER TYPE "NetworkType" ADD VALUE 'COMMUNITY';
ALTER TYPE "NetworkType" ADD VALUE 'SCHOOL';
ALTER TYPE "NetworkType" ADD VALUE 'CHURCH';
ALTER TYPE "NetworkType" ADD VALUE 'SPORTS';
ALTER TYPE "NetworkType" ADD VALUE 'COOPERATIVE';

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "notes" TEXT;
