-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('POTTERY_WORKSHOP', 'OPEN_MIC');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "event_type" "EventType" NOT NULL DEFAULT 'POTTERY_WORKSHOP',
ADD COLUMN     "lineup_notes" TEXT,
ADD COLUMN     "performers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "instructor" DROP NOT NULL,
ALTER COLUMN "level" DROP NOT NULL,
ALTER COLUMN "level" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");
