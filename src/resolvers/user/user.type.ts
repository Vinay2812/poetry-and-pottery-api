import { Field, Int, ObjectType, registerEnumType } from "type-graphql";

import { UserRole } from "@/prisma/generated/enums";

// Define UserRole in type-graphql
registerEnumType(UserRole, {
  name: "UserRole",
  description: "Defines the role of the user",
});

@ObjectType()
export class UserResponse {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  auth_id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => Boolean)
  subscribed_to_newsletter!: boolean;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;
}

@ObjectType()
export class UserCounts {
  @Field(() => Int)
  cartCount!: number;

  @Field(() => Int)
  wishlistCount!: number;

  @Field(() => Int)
  eventRegistrationsCount!: number;

  @Field(() => Int)
  pendingOrdersCount!: number;
}
