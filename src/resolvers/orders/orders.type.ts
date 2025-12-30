import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

import { ProductBase } from "../products/products.type";

// Register OrderStatus enum for GraphQL
export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  REFUNDED = "REFUNDED",
}

registerEnumType(OrderStatus, {
  name: "OrderStatus",
  description: "The status of an order",
});

@ObjectType()
export class ShippingAddress {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  addressLine1!: string;

  @Field(() => String, { nullable: true })
  addressLine2?: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  zip!: string;

  @Field(() => String, { nullable: true })
  contactNumber?: string | null;
}

@ObjectType()
export class OrderItem {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  order_id!: string;

  @Field(() => Int)
  product_id!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  discount!: number;

  @Field(() => Int)
  price!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => ProductBase)
  product!: ProductBase;

  @Field(() => Boolean)
  has_reviewed!: boolean;
}

@ObjectType()
export class OrderUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;
}

@ObjectType()
export class Order {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  user_id!: number;

  @Field(() => OrderUser)
  user!: OrderUser;

  @Field(() => Int)
  shipping_fee!: number;

  @Field(() => Int)
  subtotal!: number;

  @Field(() => Int)
  discount!: number;

  @Field(() => Int)
  total!: number;

  @Field(() => OrderStatus)
  status!: OrderStatus;

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

  @Field(() => GraphQLJSON)
  shipping_address!: ShippingAddress;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => [OrderItem])
  ordered_products!: OrderItem[];
}

@InputType()
export class OrdersFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field(() => String, { nullable: true })
  search?: string;
}

@ObjectType()
export class OrdersResponse {
  @Field(() => [Order])
  data!: Order[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;
}

@InputType()
export class ShippingAddressInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  addressLine1!: string;

  @Field(() => String, { nullable: true })
  addressLine2?: string;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  zip!: string;

  @Field(() => String, { nullable: true })
  contactNumber?: string;
}

@InputType()
export class CreateOrderInput {
  @Field(() => Int)
  shippingFee!: number;

  @Field(() => ShippingAddressInput)
  shippingAddress!: ShippingAddressInput;
}

@ObjectType()
export class OrderMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Order, { nullable: true })
  order?: Order | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
