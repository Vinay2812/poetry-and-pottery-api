import { GraphQLDateTime } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
export class UserAddress {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  address_line_1!: string;

  @Field(() => String, { nullable: true })
  address_line_2?: string | null;

  @Field(() => String, { nullable: true })
  landmark?: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  zip!: string;

  @Field(() => String, { nullable: true })
  contact_number?: string | null;
}

@ObjectType()
export class AddressesResponse {
  @Field(() => [UserAddress])
  addresses!: UserAddress[];

  @Field(() => Int)
  total!: number;
}

@InputType()
export class CreateAddressInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  address_line_1!: string;

  @Field(() => String, { nullable: true })
  address_line_2?: string | null;

  @Field(() => String, { nullable: true })
  landmark?: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  zip!: string;

  @Field(() => String, { nullable: true })
  contact_number?: string | null;
}

@InputType()
export class UpdateAddressInput {
  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  address_line_1?: string | null;

  @Field(() => String, { nullable: true })
  address_line_2?: string | null;

  @Field(() => String, { nullable: true })
  landmark?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  state?: string | null;

  @Field(() => String, { nullable: true })
  zip?: string | null;

  @Field(() => String, { nullable: true })
  contact_number?: string | null;
}

@ObjectType()
export class AddressMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => UserAddress, { nullable: true })
  address?: UserAddress | null;
}
