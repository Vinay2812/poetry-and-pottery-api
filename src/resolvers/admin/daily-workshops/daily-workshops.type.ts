import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

import {
  DailyWorkshopBlackoutType,
  DailyWorkshopRegistrationStatus,
} from "@/resolvers/daily-workshops/daily-workshops.type";

@ObjectType()
export class AdminDailyWorkshopConfig {
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

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

@ObjectType()
export class AdminDailyWorkshopPricingTier {
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

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

@ObjectType()
export class AdminDailyWorkshopBlackoutRule {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  config_id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => DailyWorkshopBlackoutType)
  type!: DailyWorkshopBlackoutType;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => String)
  timezone!: string;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => Boolean)
  auto_cancel_existing!: boolean;

  @Field(() => GraphQLDateTime, { nullable: true })
  one_time_start_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  one_time_end_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  recurrence_start_date?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  recurrence_end_date?: Date | null;

  @Field(() => [Int])
  weekdays!: number[];

  @Field(() => [Int])
  month_days!: number[];

  @Field(() => Int)
  range_start_minutes!: number;

  @Field(() => Int)
  range_end_minutes!: number;

  @Field(() => Int, { nullable: true })
  created_by_user_id?: number | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

@ObjectType()
export class AdminDailyWorkshopUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

@ObjectType()
export class AdminDailyWorkshopRegistrationSlot {
  @Field(() => Int)
  id!: number;

  @Field(() => GraphQLDateTime)
  slot_start_at!: Date;

  @Field(() => GraphQLDateTime)
  slot_end_at!: Date;
}

@ObjectType()
export class AdminDailyWorkshopRegistration {
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

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => [AdminDailyWorkshopRegistrationSlot])
  slots!: AdminDailyWorkshopRegistrationSlot[];

  @Field(() => AdminDailyWorkshopUser)
  user!: AdminDailyWorkshopUser;
}

@ObjectType()
export class AdminDailyWorkshopMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class AdminDailyWorkshopConfigMutationResponse extends AdminDailyWorkshopMutationResponse {
  @Field(() => AdminDailyWorkshopConfig, { nullable: true })
  config?: AdminDailyWorkshopConfig | null;
}

@ObjectType()
export class AdminDailyWorkshopPricingTierMutationResponse extends AdminDailyWorkshopMutationResponse {
  @Field(() => AdminDailyWorkshopPricingTier, { nullable: true })
  tier?: AdminDailyWorkshopPricingTier | null;
}

@ObjectType()
export class AdminDailyWorkshopBlackoutRuleMutationResponse extends AdminDailyWorkshopMutationResponse {
  @Field(() => AdminDailyWorkshopBlackoutRule, { nullable: true })
  rule?: AdminDailyWorkshopBlackoutRule | null;
}

@ObjectType()
export class AdminDailyWorkshopRegistrationMutationResponse extends AdminDailyWorkshopMutationResponse {
  @Field(() => AdminDailyWorkshopRegistration, { nullable: true })
  registration?: AdminDailyWorkshopRegistration | null;
}

@InputType()
export class AdminUpdateDailyWorkshopConfigInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;

  @Field(() => String, { nullable: true })
  timezone?: string;

  @Field(() => Int, { nullable: true })
  opening_hour?: number;

  @Field(() => Int, { nullable: true })
  closing_hour?: number;

  @Field(() => Int, { nullable: true })
  slot_duration_minutes?: number;

  @Field(() => Int, { nullable: true })
  slot_capacity?: number;

  @Field(() => Int, { nullable: true })
  booking_window_days?: number;

  @Field(() => Boolean, { nullable: true })
  auto_cancel_on_blackout?: boolean;
}

@InputType()
export class AdminUpsertDailyWorkshopPricingTierInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => Int)
  hours!: number;

  @Field(() => Int)
  price_per_person!: number;

  @Field(() => Int)
  pieces_per_person!: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  sort_order?: number;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  is_active?: boolean;
}

@InputType()
export class AdminUpsertDailyWorkshopBlackoutRuleInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String)
  name!: string;

  @Field(() => DailyWorkshopBlackoutType)
  type!: DailyWorkshopBlackoutType;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  is_active?: boolean;

  @Field(() => String, { nullable: true })
  timezone?: string;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  auto_cancel_existing?: boolean;

  @Field(() => GraphQLDateTime, { nullable: true })
  one_time_start_at?: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  one_time_end_at?: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  recurrence_start_date?: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  recurrence_end_date?: Date;

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  weekdays?: number[];

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  month_days?: number[];

  @Field(() => Int)
  range_start_minutes!: number;

  @Field(() => Int)
  range_end_minutes!: number;
}

@InputType()
export class AdminUpdateDailyWorkshopRegistrationInput {
  @Field(() => Int, { nullable: true })
  participants?: number;

  @Field(() => Int, { nullable: true })
  price_per_person?: number;

  @Field(() => Int, { nullable: true })
  pieces_per_person?: number;

  @Field(() => Int, { nullable: true })
  discount?: number;

  @Field(() => [GraphQLDateTime], { nullable: true })
  slot_start_times?: Date[];
}
