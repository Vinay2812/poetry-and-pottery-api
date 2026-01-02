import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
export class AdminRegistrationMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@InputType()
export class UpdateRegistrationDetailsInput {
  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => Int)
  seatsReserved!: number;
}
