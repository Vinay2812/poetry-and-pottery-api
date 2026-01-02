import { GraphQLDateTime } from "graphql-scalars";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class NewsletterStatus {
  @Field(() => Boolean)
  subscribed!: boolean;

  @Field(() => GraphQLDateTime, { nullable: true })
  subscribed_at?: Date | null;
}

@ObjectType()
export class NewsletterMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => NewsletterStatus, { nullable: true })
  status?: NewsletterStatus | null;
}
