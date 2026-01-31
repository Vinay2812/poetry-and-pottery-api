import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// ============================================================================
// CustomizationOption Types
// ============================================================================

@ObjectType()
export class CustomizationOption {
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
// Category with Options Count
// ============================================================================

@ObjectType()
export class CustomizationCategory {
  @Field(() => String)
  category!: string;

  @Field(() => Int)
  options_count!: number;

  @Field(() => Int)
  base_price!: number;

  @Field(() => String, { nullable: true })
  image_url?: string | null;
}

// ============================================================================
// Grouped Options by Type
// ============================================================================

@ObjectType()
export class CustomizationOptionsByType {
  @Field(() => String)
  type!: string;

  @Field(() => [CustomizationOption])
  options!: CustomizationOption[];
}

// ============================================================================
// Filter Inputs
// ============================================================================

@InputType()
export class CustomizationCategoriesFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

@InputType()
export class CustomizationOptionsFilterInput {
  @Field(() => String)
  category!: string;

  @Field(() => String, { nullable: true })
  type?: string;
}

// ============================================================================
// Response Types
// ============================================================================

@ObjectType()
export class CustomizationCategoriesResponse {
  @Field(() => [CustomizationCategory])
  categories!: CustomizationCategory[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Boolean)
  has_more!: boolean;
}

@ObjectType()
export class CustomizationOptionsResponse {
  @Field(() => String)
  category!: string;

  @Field(() => [CustomizationOptionsByType])
  options_by_type!: CustomizationOptionsByType[];

  @Field(() => Int)
  total_options!: number;
}

// ============================================================================
// Customization Data for Cart/Wishlist/Order
// ============================================================================

@ObjectType()
export class CustomizationSelection {
  @Field(() => String)
  type!: string;

  @Field(() => Int)
  option_id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;

  @Field(() => Int)
  price_modifier!: number;
}

@ObjectType()
export class ProductCustomization {
  @Field(() => [CustomizationSelection])
  selections!: CustomizationSelection[];

  @Field(() => Int)
  total_modifier!: number;
}

@InputType()
export class CustomizationSelectionInput {
  @Field(() => String)
  type!: string;

  @Field(() => Int)
  option_id!: number;
}

@InputType()
export class ProductCustomizationInput {
  @Field(() => [CustomizationSelectionInput])
  selections!: CustomizationSelectionInput[];
}
