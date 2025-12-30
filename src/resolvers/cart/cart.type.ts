import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

import { ProductBase } from "../products/products.type";

@ObjectType()
export class CartItem {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  product_id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => ProductBase)
  product!: ProductBase;
}

@ObjectType()
export class CartResponse {
  @Field(() => [CartItem])
  items!: CartItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  subtotal!: number;
}

@InputType()
export class AddToCartInput {
  @Field(() => Int)
  product_id!: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  quantity?: number;
}

@InputType()
export class UpdateCartQuantityInput {
  @Field(() => Int)
  product_id!: number;

  @Field(() => Int)
  quantity!: number;
}

@ObjectType()
export class CartMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => CartItem, { nullable: true })
  item?: CartItem | null;
}
