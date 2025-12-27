-- AlterTable
ALTER TABLE "product_orders" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchased_product_items" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0;
