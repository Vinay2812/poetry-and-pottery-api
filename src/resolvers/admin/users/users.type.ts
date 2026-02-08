import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

import { UserRole } from "@/prisma/generated/client";
import { DailyWorkshopRegistrationStatus } from "@/resolvers/daily-workshops/daily-workshops.type";

// Note: UserRole enum is registered in src/resolvers/user/user.type.ts
// Do not register it again here

@ObjectType()
export class AdminUserCount {
  @Field(() => Int)
  product_orders!: number;

  @Field(() => Int)
  event_registrations!: number;

  @Field(() => Int)
  daily_workshop_registrations!: number;
}

@ObjectType()
export class AdminUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  auth_id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminUserCount)
  _count!: AdminUserCount;

  @Field(() => Int)
  pendingOrdersCount!: number;

  @Field(() => Int)
  pendingRegistrationsCount!: number;
}

@ObjectType()
export class AdminUserDetailCount {
  @Field(() => Int)
  product_orders!: number;

  @Field(() => Int)
  event_registrations!: number;

  @Field(() => Int)
  daily_workshop_registrations!: number;

  @Field(() => Int)
  wishlists!: number;

  @Field(() => Int)
  carts!: number;

  @Field(() => Int)
  reviews!: number;
}

@ObjectType()
export class AdminUserDetail {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  auth_id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => AdminUserDetailCount)
  _count!: AdminUserDetailCount;
}

@InputType()
export class AdminUsersFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;

  @Field(() => String, { nullable: true })
  sort?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

@ObjectType()
export class AdminUsersResponse {
  @Field(() => [AdminUser])
  users!: AdminUser[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class AdminUserMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

// User Order types
@ObjectType()
export class AdminUserOrderProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => [String])
  image_urls!: string[];
}

@ObjectType()
export class AdminUserOrderItem {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => AdminUserOrderProduct)
  product!: AdminUserOrderProduct;
}

@ObjectType()
export class AdminUserOrder {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  total!: number;

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => Float)
  shipping_fee!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  request_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  approved_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  paid_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  shipped_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  delivered_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  cancelled_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  returned_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  refunded_at?: Date | null;

  @Field(() => [AdminUserOrderItem])
  ordered_products!: AdminUserOrderItem[];
}

// User Registration types
@ObjectType()
export class AdminUserRegistrationEvent {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => GraphQLDateTime)
  starts_at!: Date;

  @Field(() => GraphQLDateTime)
  ends_at!: Date;

  @Field(() => String)
  location!: string;

  @Field(() => String)
  image!: string;

  @Field(() => Float)
  price!: number;
}

@ObjectType()
export class AdminUserRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Int)
  seats_reserved!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

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

  @Field(() => AdminUserRegistrationEvent)
  event!: AdminUserRegistrationEvent;
}

@ObjectType()
export class AdminUserDailyWorkshopRegistrationSlot {
  @Field(() => Int)
  id!: number;

  @Field(() => GraphQLDateTime)
  slot_start_at!: Date;

  @Field(() => GraphQLDateTime)
  slot_end_at!: Date;
}

@ObjectType()
export class AdminUserDailyWorkshopRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => DailyWorkshopRegistrationStatus)
  status!: DailyWorkshopRegistrationStatus;

  @Field(() => Int)
  participants!: number;

  @Field(() => Int)
  total_hours!: number;

  @Field(() => Int)
  slots_count!: number;

  @Field(() => Float)
  price_per_person!: number;

  @Field(() => Float)
  pieces_per_person!: number;

  @Field(() => Float)
  base_amount!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => Float)
  final_amount!: number;

  @Field(() => Float)
  total_pieces!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => GraphQLJSON)
  pricing_snapshot!: object;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

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

  @Field(() => [AdminUserDailyWorkshopRegistrationSlot])
  slots!: AdminUserDailyWorkshopRegistrationSlot[];
}

// User Cart types
@ObjectType()
export class AdminUserCartProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => [String])
  image_urls!: string[];
}

@ObjectType()
export class AdminUserCartItem {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminUserCartProduct)
  product!: AdminUserCartProduct;
}

// User Wishlist types
@ObjectType()
export class AdminUserWishlistProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => [String])
  image_urls!: string[];
}

@ObjectType()
export class AdminUserWishlistItem {
  @Field(() => Int)
  id!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminUserWishlistProduct)
  product!: AdminUserWishlistProduct;
}

@ObjectType()
export class AdminUserWishlistResponse {
  @Field(() => [AdminUserWishlistItem])
  data!: AdminUserWishlistItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  totalPages!: number;
}
