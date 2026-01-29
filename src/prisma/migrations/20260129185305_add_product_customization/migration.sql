/*
  Warnings:

  - A unique constraint covering the columns `[user_id,product_id,custom_data_hash]` on the table `carts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id,product_id,custom_data_hash]` on the table `purchased_product_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,product_id,custom_data_hash]` on the table `wishlists` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "carts_user_id_product_id_key";

-- DropIndex
DROP INDEX "purchased_product_items_order_id_product_id_key";

-- DropIndex
DROP INDEX "wishlists_user_id_product_id_key";

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "custom_data" JSONB,
ADD COLUMN     "custom_data_hash" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "purchased_product_items" ADD COLUMN     "custom_data" JSONB,
ADD COLUMN     "custom_data_hash" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "wishlists" ADD COLUMN     "custom_data" JSONB,
ADD COLUMN     "custom_data_hash" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "customization_options" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "price_modifier" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customization_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customization_options_category_idx" ON "customization_options"("category");

-- CreateIndex
CREATE INDEX "customization_options_type_idx" ON "customization_options"("type");

-- CreateIndex
CREATE INDEX "customization_options_is_active_idx" ON "customization_options"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "customization_options_category_type_value_key" ON "customization_options"("category", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_product_id_custom_data_hash_key" ON "carts"("user_id", "product_id", "custom_data_hash");

-- CreateIndex
CREATE UNIQUE INDEX "purchased_product_items_order_id_product_id_custom_data_has_key" ON "purchased_product_items"("order_id", "product_id", "custom_data_hash");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_product_id_custom_data_hash_key" ON "wishlists"("user_id", "product_id", "custom_data_hash");
