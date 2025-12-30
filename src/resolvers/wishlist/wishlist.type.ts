import { GraphQLDateTime } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

import { ProductBase } from "../products/products.type";

export enum ToggleAction {
  ADDED = "added",
  REMOVED = "removed",
}

registerEnumType(ToggleAction, {
  name: "ToggleAction",
  description: "The action performed when toggling wishlist",
});

@ObjectType()
export class WishlistItem {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  product_id!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => ProductBase)
  product!: ProductBase;
}

@ObjectType()
export class WishlistResponse {
  @Field(() => [WishlistItem])
  data!: WishlistItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;
}

@InputType()
export class WishlistFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 12 })
  limit?: number;
}

@ObjectType()
export class ToggleWishlistResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => ToggleAction)
  action!: ToggleAction;

  @Field(() => WishlistItem, { nullable: true })
  item?: WishlistItem | null;
}

@ObjectType()
export class WishlistMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => WishlistItem, { nullable: true })
  item?: WishlistItem | null;
}
