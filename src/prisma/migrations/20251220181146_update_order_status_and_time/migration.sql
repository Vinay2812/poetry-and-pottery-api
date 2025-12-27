-- AlterTable
ALTER TABLE "product_orders" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "request_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';
