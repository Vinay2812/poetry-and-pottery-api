import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

import {
  DailyWorkshopBlackoutType as PrismaDailyWorkshopBlackoutType,
  DailyWorkshopRegistrationStatus as PrismaDailyWorkshopRegistrationStatus,
} from "@/prisma/generated/client";

export const DailyWorkshopRegistrationStatus =
  PrismaDailyWorkshopRegistrationStatus;
export type DailyWorkshopRegistrationStatus =
  (typeof DailyWorkshopRegistrationStatus)[keyof typeof DailyWorkshopRegistrationStatus];

registerEnumType(DailyWorkshopRegistrationStatus, {
  name: "DailyWorkshopRegistrationStatus",
  description: "Status of a daily workshop registration",
});

export const DailyWorkshopBlackoutType = PrismaDailyWorkshopBlackoutType;
export type DailyWorkshopBlackoutType =
  (typeof DailyWorkshopBlackoutType)[keyof typeof DailyWorkshopBlackoutType];

registerEnumType(DailyWorkshopBlackoutType, {
  name: "DailyWorkshopBlackoutType",
  description: "Blackout recurrence type for daily workshop slots",
});

@ObjectType()
export class DailyWorkshopPricingTier {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  config_id!: number;

  @Field(() => Int)
  hours!: number;

  @Field(() => Int)
  price_per_person!: number;

  @Field(() => Int)
  pieces_per_person!: number;

  @Field(() => Int)
  sort_order!: number;

  @Field(() => Boolean)
  is_active!: boolean;
}

@ObjectType()
export class DailyWorkshopConfig {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => String)
  timezone!: string;

  @Field(() => Int)
  opening_hour!: number;

  @Field(() => Int)
  closing_hour!: number;

  @Field(() => Int)
  slot_duration_minutes!: number;

  @Field(() => Int)
  slot_capacity!: number;

  @Field(() => Int)
  booking_window_days!: number;

  @Field(() => Boolean)
  auto_cancel_on_blackout!: boolean;

  @Field(() => [DailyWorkshopPricingTier])
  pricing_tiers!: DailyWorkshopPricingTier[];
}

@ObjectType()
export class DailyWorkshopSlotAvailability {
  @Field(() => GraphQLDateTime)
  slot_start_at!: Date;

  @Field(() => GraphQLDateTime)
  slot_end_at!: Date;

  @Field(() => Boolean)
  is_available!: boolean;

  @Field(() => Int)
  reserved_participants!: number;

  @Field(() => Int)
  remaining_capacity!: number;

  @Field(() => String, { nullable: true })
  reason?: string | null;
}

@ObjectType()
export class DailyWorkshopAvailabilityDay {
  @Field(() => String)
  date_key!: string;

  @Field(() => String)
  label!: string;

  @Field(() => [DailyWorkshopSlotAvailability])
  slots!: DailyWorkshopSlotAvailability[];
}

@ObjectType()
export class DailyWorkshopAvailabilityResponse {
  @Field(() => DailyWorkshopConfig)
  config!: DailyWorkshopConfig;

  @Field(() => [DailyWorkshopAvailabilityDay])
  days!: DailyWorkshopAvailabilityDay[];
}

@ObjectType()
export class DailyWorkshopRegistrationSlot {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  registration_id!: string;

  @Field(() => GraphQLDateTime)
  slot_start_at!: Date;

  @Field(() => GraphQLDateTime)
  slot_end_at!: Date;
}

@ObjectType()
export class DailyWorkshopRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  config_id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  participants!: number;

  @Field(() => Int)
  total_hours!: number;

  @Field(() => Int)
  slots_count!: number;

  @Field(() => Int)
  price_per_person!: number;

  @Field(() => Int)
  pieces_per_person!: number;

  @Field(() => Int)
  base_amount!: number;

  @Field(() => Int)
  discount!: number;

  @Field(() => Int)
  final_amount!: number;

  @Field(() => Int)
  total_pieces!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => GraphQLJSON)
  pricing_snapshot!: object;

  @Field(() => DailyWorkshopRegistrationStatus)
  status!: DailyWorkshopRegistrationStatus;

  @Field(() => GraphQLDateTime, { nullable: true })
  request_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  approved_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  paid_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  confirmed_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  cancelled_at?: Date | null;

  @Field(() => String, { nullable: true })
  cancelled_reason?: string | null;

  @Field(() => Int, { nullable: true })
  cancelled_by_user_id?: number | null;

  @Field(() => String, { nullable: true })
  cancelled_by_blackout_rule_id?: string | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => [DailyWorkshopRegistrationSlot])
  slots!: DailyWorkshopRegistrationSlot[];
}

@ObjectType()
export class DailyWorkshopRegistrationsResponse {
  @Field(() => [DailyWorkshopRegistration])
  data!: DailyWorkshopRegistration[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;
}

@InputType()
export class DailyWorkshopAvailabilityInput {
  @Field(() => GraphQLDateTime, { nullable: true })
  start_date?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 7 })
  days?: number;

  @Field(() => Int, { nullable: true })
  config_id?: number;
}

@InputType()
export class CreateDailyWorkshopRegistrationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  participants?: number;

  @Field(() => [GraphQLDateTime])
  slot_start_times!: Date[];

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  discount?: number;

  @Field(() => Int, { nullable: true })
  config_id?: number;
}

@InputType()
export class RescheduleDailyWorkshopRegistrationInput {
  @Field(() => String)
  registration_id!: string;

  @Field(() => [GraphQLDateTime])
  slot_start_times!: Date[];
}

@InputType()
export class DailyWorkshopRegistrationsFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 12 })
  limit?: number;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => DailyWorkshopRegistrationStatus, { nullable: true })
  status?: DailyWorkshopRegistrationStatus;
}

@ObjectType()
export class CreateDailyWorkshopRegistrationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => DailyWorkshopRegistration, { nullable: true })
  registration?: DailyWorkshopRegistration | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
