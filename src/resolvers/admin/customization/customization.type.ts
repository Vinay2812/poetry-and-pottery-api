import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// ============================================================================
// Admin Customization Option Types
// ============================================================================

@ObjectType()
export class AdminCustomizationOption {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  category!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;

  @Field(() => Int)
  price_modifier!: number;

  @Field(() => Int)
  sort_order!: number;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

// ============================================================================
// Filter Input
// ============================================================================

@InputType()
export class AdminCustomizationOptionsFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

@ObjectType()
export class AdminCustomizationOptionsResponse {
  @Field(() => [AdminCustomizationOption])
  options!: AdminCustomizationOption[];

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
export class AdminCustomizationMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Int, { nullable: true })
  optionId?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

// ============================================================================
// Create Input
// ============================================================================

@InputType()
export class CreateCustomizationOptionInput {
  @Field(() => String)
  category!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  price_modifier?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  sort_order?: number;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  is_active?: boolean;
}

// ============================================================================
// Update Input
// ============================================================================

@InputType()
export class UpdateCustomizationOptionInput {
  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  value?: string;

  @Field(() => Int, { nullable: true })
  price_modifier?: number;

  @Field(() => Int, { nullable: true })
  sort_order?: number;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;
}

// ============================================================================
// Summary Types for Dropdowns
// ============================================================================

@ObjectType()
export class AdminCustomizationCategorySummary {
  @Field(() => String)
  category!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class AdminCustomizationTypeSummary {
  @Field(() => String)
  type!: string;

  @Field(() => Int)
  count!: number;
}
