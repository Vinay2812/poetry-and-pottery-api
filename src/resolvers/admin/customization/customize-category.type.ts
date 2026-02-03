import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

import { AdminCustomizationOption } from "./customization.type";

// ============================================================================
// Admin Customize Category Types
// ============================================================================

@ObjectType()
export class AdminCustomizeCategory {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  category!: string;

  @Field(() => Int)
  base_price!: number;

  @Field(() => String, { nullable: true })
  image_url?: string | null;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => Int)
  options_count!: number;

  @Field(() => [AdminCustomizationOption])
  options!: AdminCustomizationOption[];
}

// ============================================================================
// Response Types
// ============================================================================

@ObjectType()
export class AdminCustomizeCategoriesResponse {
  @Field(() => [AdminCustomizeCategory])
  categories!: AdminCustomizeCategory[];

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class AdminCustomizeCategoryMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Int, { nullable: true })
  categoryId?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

// ============================================================================
// Create Input
// ============================================================================

@InputType()
export class CreateCustomizeCategoryInput {
  @Field(() => String)
  category!: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  base_price?: number;

  @Field(() => String, { nullable: true })
  image_url?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  is_active?: boolean;
}

// ============================================================================
// Update Input
// ============================================================================

@InputType()
export class UpdateCustomizeCategoryInput {
  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => Int, { nullable: true })
  base_price?: number;

  @Field(() => String, { nullable: true })
  image_url?: string;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;
}
