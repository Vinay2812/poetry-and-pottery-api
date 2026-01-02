import { GraphQLDateTime } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

import { ReviewLike, ReviewUser } from "../products/products.type";

// Toggle action enum for review likes
export enum ToggleLikeAction {
  LIKED = "LIKED",
  UNLIKED = "UNLIKED",
}

registerEnumType(ToggleLikeAction, {
  name: "ToggleLikeAction",
  description: "The action taken when toggling a review like",
});

// Re-export for convenience
export { ReviewLike, ReviewUser };

@ObjectType()
export class Review {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string | null;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => Int, { nullable: true })
  product_id?: number | null;

  @Field(() => String, { nullable: true })
  event_id?: string | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => ReviewUser)
  user!: ReviewUser;

  @Field(() => [ReviewLike])
  likes!: ReviewLike[];

  @Field(() => Int)
  likes_count!: number;

  @Field(() => Boolean)
  is_liked_by_current_user!: boolean;
}

@ObjectType()
export class ReviewsResponse {
  @Field(() => [Review])
  data!: Review[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;
}

@InputType()
export class ReviewsFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;
}

@InputType()
export class CreateProductReviewInput {
  @Field(() => Int)
  productId!: number;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string;

  @Field(() => [String], { nullable: true })
  imageUrls?: string[];
}

@InputType()
export class CreateEventReviewInput {
  @Field(() => String)
  eventId!: string;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string;

  @Field(() => [String], { nullable: true })
  imageUrls?: string[];
}

@ObjectType()
export class CreateReviewResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Review, { nullable: true })
  review?: Review | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class DeleteReviewResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class ToggleReviewLikeResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => ToggleLikeAction, { nullable: true })
  action?: ToggleLikeAction | null;

  @Field(() => Int, { nullable: true })
  likes_count?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
