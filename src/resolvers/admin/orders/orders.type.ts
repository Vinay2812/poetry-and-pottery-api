import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

import { OrderStatus } from "@/prisma/generated/client";

@ObjectType()
export class AdminOrderMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@InputType()
export class UpdateOrderStatusInput {
  @Field(() => String)
  orderId!: string;

  @Field(() => String)
  status!: string;
}
