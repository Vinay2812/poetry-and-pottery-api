-- CreateEnum
CREATE TYPE "DailyWorkshopRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DailyWorkshopBlackoutType" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "daily_workshop_configs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Daily Workshop',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "opening_hour" INTEGER NOT NULL DEFAULT 13,
    "closing_hour" INTEGER NOT NULL DEFAULT 19,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "slot_capacity" INTEGER NOT NULL DEFAULT 6,
    "booking_window_days" INTEGER NOT NULL DEFAULT 90,
    "auto_cancel_on_blackout" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_workshop_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_workshop_pricing_tiers" (
    "id" SERIAL NOT NULL,
    "config_id" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "price_per_person" INTEGER NOT NULL,
    "pieces_per_person" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_workshop_pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_workshop_blackout_rules" (
    "id" TEXT NOT NULL,
    "config_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DailyWorkshopBlackoutType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "reason" TEXT,
    "auto_cancel_existing" BOOLEAN NOT NULL DEFAULT true,
    "one_time_start_at" TIMESTAMP(3),
    "one_time_end_at" TIMESTAMP(3),
    "recurrence_start_date" TIMESTAMP(3),
    "recurrence_end_date" TIMESTAMP(3),
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "month_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "range_start_minutes" INTEGER NOT NULL,
    "range_end_minutes" INTEGER NOT NULL,
    "created_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_workshop_blackout_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_workshop_registrations" (
    "id" TEXT NOT NULL,
    "config_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "total_hours" INTEGER NOT NULL,
    "slots_count" INTEGER NOT NULL,
    "price_per_person" INTEGER NOT NULL,
    "pieces_per_person" INTEGER NOT NULL,
    "base_amount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "final_amount" INTEGER NOT NULL,
    "total_pieces" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "pricing_snapshot" JSONB NOT NULL,
    "status" "DailyWorkshopRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "request_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "cancelled_by_user_id" INTEGER,
    "cancelled_by_blackout_rule_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_workshop_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_workshop_registration_slots" (
    "id" SERIAL NOT NULL,
    "registration_id" TEXT NOT NULL,
    "slot_start_at" TIMESTAMP(3) NOT NULL,
    "slot_end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_workshop_registration_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_workshop_configs_key_key" ON "daily_workshop_configs"("key");

-- CreateIndex
CREATE INDEX "daily_workshop_pricing_tiers_config_id_idx" ON "daily_workshop_pricing_tiers"("config_id");

-- CreateIndex
CREATE INDEX "daily_workshop_pricing_tiers_is_active_idx" ON "daily_workshop_pricing_tiers"("is_active");

-- CreateIndex
CREATE INDEX "daily_workshop_pricing_tiers_sort_order_idx" ON "daily_workshop_pricing_tiers"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "daily_workshop_pricing_tiers_config_id_hours_key" ON "daily_workshop_pricing_tiers"("config_id", "hours");

-- CreateIndex
CREATE INDEX "daily_workshop_blackout_rules_config_id_is_active_idx" ON "daily_workshop_blackout_rules"("config_id", "is_active");

-- CreateIndex
CREATE INDEX "daily_workshop_blackout_rules_type_is_active_idx" ON "daily_workshop_blackout_rules"("type", "is_active");

-- CreateIndex
CREATE INDEX "daily_workshop_blackout_rules_one_time_start_at_one_time_en_idx" ON "daily_workshop_blackout_rules"("one_time_start_at", "one_time_end_at");

-- CreateIndex
CREATE INDEX "daily_workshop_blackout_rules_recurrence_start_date_recurre_idx" ON "daily_workshop_blackout_rules"("recurrence_start_date", "recurrence_end_date");

-- CreateIndex
CREATE INDEX "daily_workshop_blackout_rules_created_by_user_id_idx" ON "daily_workshop_blackout_rules"("created_by_user_id");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_config_id_idx" ON "daily_workshop_registrations"("config_id");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_user_id_idx" ON "daily_workshop_registrations"("user_id");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_status_idx" ON "daily_workshop_registrations"("status");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_created_at_idx" ON "daily_workshop_registrations"("created_at");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_cancelled_by_user_id_idx" ON "daily_workshop_registrations"("cancelled_by_user_id");

-- CreateIndex
CREATE INDEX "daily_workshop_registrations_cancelled_by_blackout_rule_id_idx" ON "daily_workshop_registrations"("cancelled_by_blackout_rule_id");

-- CreateIndex
CREATE INDEX "daily_workshop_registration_slots_slot_start_at_idx" ON "daily_workshop_registration_slots"("slot_start_at");

-- CreateIndex
CREATE INDEX "daily_workshop_registration_slots_slot_end_at_idx" ON "daily_workshop_registration_slots"("slot_end_at");

-- CreateIndex
CREATE INDEX "daily_workshop_registration_slots_registration_id_idx" ON "daily_workshop_registration_slots"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_workshop_registration_slots_registration_id_slot_star_key" ON "daily_workshop_registration_slots"("registration_id", "slot_start_at");

-- AddForeignKey
ALTER TABLE "daily_workshop_pricing_tiers" ADD CONSTRAINT "daily_workshop_pricing_tiers_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "daily_workshop_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workshop_blackout_rules" ADD CONSTRAINT "daily_workshop_blackout_rules_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "daily_workshop_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workshop_registrations" ADD CONSTRAINT "daily_workshop_registrations_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "daily_workshop_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workshop_registrations" ADD CONSTRAINT "daily_workshop_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workshop_registrations" ADD CONSTRAINT "daily_workshop_registrations_cancelled_by_blackout_rule_id_fkey" FOREIGN KEY ("cancelled_by_blackout_rule_id") REFERENCES "daily_workshop_blackout_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workshop_registration_slots" ADD CONSTRAINT "daily_workshop_registration_slots_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "daily_workshop_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual CHECK constraints

-- Config: opening_hour < closing_hour, valid range
ALTER TABLE "daily_workshop_configs"
  ADD CONSTRAINT "chk_config_hours" CHECK ("opening_hour" >= 0 AND "opening_hour" < "closing_hour" AND "closing_hour" <= 24),
  ADD CONSTRAINT "chk_config_slot_duration" CHECK ("slot_duration_minutes" > 0),
  ADD CONSTRAINT "chk_config_capacity" CHECK ("slot_capacity" > 0),
  ADD CONSTRAINT "chk_config_booking_window" CHECK ("booking_window_days" > 0);

-- Pricing tier: positive values
ALTER TABLE "daily_workshop_pricing_tiers"
  ADD CONSTRAINT "chk_tier_hours" CHECK ("hours" > 0),
  ADD CONSTRAINT "chk_tier_price" CHECK ("price_per_person" >= 0),
  ADD CONSTRAINT "chk_tier_pieces" CHECK ("pieces_per_person" >= 0);

-- Blackout: minute ranges valid
ALTER TABLE "daily_workshop_blackout_rules"
  ADD CONSTRAINT "chk_blackout_minutes" CHECK ("range_start_minutes" >= 0 AND "range_start_minutes" < "range_end_minutes" AND "range_end_minutes" <= 1440);

-- Registration: positive values
ALTER TABLE "daily_workshop_registrations"
  ADD CONSTRAINT "chk_reg_participants" CHECK ("participants" > 0),
  ADD CONSTRAINT "chk_reg_total_hours" CHECK ("total_hours" > 0),
  ADD CONSTRAINT "chk_reg_slots_count" CHECK ("slots_count" > 0),
  ADD CONSTRAINT "chk_reg_base_amount" CHECK ("base_amount" >= 0),
  ADD CONSTRAINT "chk_reg_final_amount" CHECK ("final_amount" >= 0),
  ADD CONSTRAINT "chk_reg_total_pieces" CHECK ("total_pieces" >= 0);
