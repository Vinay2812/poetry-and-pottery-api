import { GraphQLDateTime } from "graphql-scalars";
import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
export class AdminProductCount {
  @Field(() => Int)
  reviews!: number;

  @Field(() => Int)
  wishlists!: number;

  @Field(() => Int)
  carts!: number;
}

@ObjectType()
export class AdminProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  total_quantity!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => String)
  color_name!: string;

  @Field(() => String)
  color_code!: string;

  @Field(() => String)
  material!: string;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => [String])
  categories!: string[];

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminProductCount)
  _count!: AdminProductCount;
}

@ObjectType()
export class AdminProductDetailCount {
  @Field(() => Int)
  reviews!: number;

  @Field(() => Int)
  wishlists!: number;

  @Field(() => Int)
  carts!: number;

  @Field(() => Int)
  purchased_products!: number;
}

@ObjectType()
export class AdminProductDetail {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [String])
  instructions!: string[];

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  total_quantity!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => String)
  color_name!: string;

  @Field(() => String)
  color_code!: string;

  @Field(() => String)
  material!: string;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => [String])
  categories!: string[];

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => AdminProductDetailCount)
  _count!: AdminProductDetailCount;
}

@InputType()
export class AdminProductsFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => Boolean, { nullable: true })
  lowStock?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

@ObjectType()
export class AdminProductsResponse {
  @Field(() => [AdminProduct])
  products!: AdminProduct[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

@InputType()
export class CreateProductInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  instructions?: string[];

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  total_quantity!: number;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  is_active?: boolean;

  @Field(() => String)
  color_name!: string;

  @Field(() => String)
  color_code!: string;

  @Field(() => String)
  material!: string;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => [String])
  categories!: string[];
}

@InputType()
export class UpdateProductInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  instructions?: string[];

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Int, { nullable: true })
  total_quantity?: number;

  @Field(() => Int, { nullable: true })
  available_quantity?: number;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;

  @Field(() => String, { nullable: true })
  color_name?: string;

  @Field(() => String, { nullable: true })
  color_code?: string;

  @Field(() => String, { nullable: true })
  material?: string;

  @Field(() => [String], { nullable: true })
  image_urls?: string[];

  @Field(() => [String], { nullable: true })
  categories?: string[];
}

@ObjectType()
export class AdminMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class AdminProductMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Int, { nullable: true })
  productId?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class AdminProductReviewUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

@ObjectType()
export class AdminProductReview {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string | null;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminProductReviewUser)
  user!: AdminProductReviewUser;
}

@ObjectType()
export class AdminProductReviewsResponse {
  @Field(() => [AdminProductReview])
  reviews!: AdminProductReview[];

  @Field(() => Int)
  total!: number;

  @Field(() => Float)
  averageRating!: number;
}
