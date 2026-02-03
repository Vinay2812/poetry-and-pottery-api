/*
  Warnings:

  - You are about to drop the column `category` on the `customization_options` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customize_category_id,type,value]` on the table `customization_options` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customize_category_id` to the `customization_options` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "customization_options_category_idx";

-- DropIndex
DROP INDEX "customization_options_category_type_value_key";

-- AlterTable
ALTER TABLE "customization_options" DROP COLUMN "category",
ADD COLUMN     "customize_category_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "customize_categories" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "base_price" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customize_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customize_categories_category_key" ON "customize_categories"("category");

-- CreateIndex
CREATE INDEX "customize_categories_is_active_idx" ON "customize_categories"("is_active");

-- CreateIndex
CREATE INDEX "customization_options_customize_category_id_idx" ON "customization_options"("customize_category_id");

-- CreateIndex
CREATE INDEX "customization_options_value_idx" ON "customization_options"("value");

-- CreateIndex
CREATE INDEX "customization_options_price_modifier_idx" ON "customization_options"("price_modifier");

-- CreateIndex
CREATE INDEX "customization_options_sort_order_idx" ON "customization_options"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "customization_options_customize_category_id_type_value_key" ON "customization_options"("customize_category_id", "type", "value");

-- AddForeignKey
ALTER TABLE "customization_options" ADD CONSTRAINT "customization_options_customize_category_id_fkey" FOREIGN KEY ("customize_category_id") REFERENCES "customize_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
