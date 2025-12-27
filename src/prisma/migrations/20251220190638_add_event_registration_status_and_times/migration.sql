-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventRegistrationStatus" ADD VALUE 'APPROVED';
ALTER TYPE "EventRegistrationStatus" ADD VALUE 'REJECTED';
ALTER TYPE "EventRegistrationStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "request_at" TIMESTAMP(3);
