import { Field, InputType, Int, ObjectType } from "type-graphql";

import { EventBase } from "../events/events.type";
import { Order } from "../orders/orders.type";
import { ProductBase } from "../products/products.type";

@ObjectType()
export class SearchCounts {
  @Field(() => Int)
  products!: number;

  @Field(() => Int)
  events!: number;

  @Field(() => Int)
  orders!: number;
}

@ObjectType()
export class GlobalSearchResponse {
  @Field(() => [ProductBase])
  products!: ProductBase[];

  @Field(() => [EventBase])
  events!: EventBase[];

  @Field(() => [Order])
  orders!: Order[];

  @Field(() => SearchCounts)
  counts!: SearchCounts;
}

@InputType()
export class GlobalSearchInput {
  @Field(() => String)
  query!: string;

  @Field(() => Int, { nullable: true, defaultValue: 5 })
  limit?: number;
}
