-- AlterTable
ALTER TABLE "users" ADD COLUMN     "newsletter_subscribed_at" TIMESTAMP(3),
ADD COLUMN     "subscribed_to_newsletter" BOOLEAN NOT NULL DEFAULT false;
