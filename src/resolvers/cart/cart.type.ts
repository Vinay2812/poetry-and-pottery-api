import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

import { ProductBase } from "../products/products.type";
import { ProductCustomizationData } from "../shared/customization.type";

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

  @Field(() => ProductCustomizationData, { nullable: true })
  custom_data?: ProductCustomizationData | null;

  @Field(() => String)
  custom_data_hash!: string;
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

  @Field(() => GraphQLJSON, { nullable: true })
  custom_data?: PrismaJson.ProductCustomizationData | null;
}

@InputType()
export class UpdateCartQuantityInput {
  @Field(() => Int)
  product_id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String, { nullable: true, defaultValue: "" })
  custom_data_hash?: string;
}

@ObjectType()
export class CartMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => CartItem, { nullable: true })
  item?: CartItem | null;
}
