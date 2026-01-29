import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// ============ RESPONSE TYPES ============

@ObjectType()
export class AdminCollection {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  image_url?: string | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  starts_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  ends_at?: Date | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => Int)
  products_count!: number;
}

@ObjectType()
export class AdminCollectionProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  image_url?: string | null;

  @Field(() => Int)
  price!: number;

  @Field(() => Boolean)
  is_active!: boolean;
}

@ObjectType()
export class AdminCollectionDetail extends AdminCollection {
  @Field(() => [AdminCollectionProduct])
  products!: AdminCollectionProduct[];
}

@ObjectType()
export class AdminCollectionsResponse {
  @Field(() => [AdminCollection])
  collections!: AdminCollection[];

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
export class AdminCollectionMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Int, { nullable: true })
  collectionId?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

// ============ INPUT TYPES ============

@InputType()
export class AdminCollectionsFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

@InputType()
export class CreateCollectionInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  image_url?: string;

  @Field(() => GraphQLDateTime, { nullable: true })
  starts_at?: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  ends_at?: Date;
}

@InputType()
export class UpdateCollectionInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  image_url?: string;

  @Field(() => GraphQLDateTime, { nullable: true })
  starts_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  ends_at?: Date | null;
}

@InputType()
export class AssignProductsToCollectionInput {
  @Field(() => Int)
  collectionId!: number;

  @Field(() => [Int])
  productIds!: number[];
}
