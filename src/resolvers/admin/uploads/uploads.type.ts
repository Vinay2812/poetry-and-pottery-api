import { Field, InputType, Int, ObjectType } from "type-graphql";

@InputType()
export class GetPresignedUploadUrlInput {
  @Field(() => String)
  filename!: string;

  @Field(() => String)
  contentType!: string;

  @Field(() => Int)
  fileSize!: number;

  @Field(() => String, { nullable: true })
  folder?: string;
}

@ObjectType()
export class PresignedUploadUrlResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  presignedUrl?: string | null;

  @Field(() => String, { nullable: true })
  publicUrl?: string | null;

  @Field(() => String, { nullable: true })
  key?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
