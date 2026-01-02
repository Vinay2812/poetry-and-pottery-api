import { Field, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
export class AdminCategory {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  icon!: string;

  @Field(() => Int)
  productCount!: number;
}

@ObjectType()
export class AdminCategoriesResponse {
  @Field(() => [AdminCategory])
  categories!: AdminCategory[];

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class AdminCategoryConfig {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  icon!: string;
}

@ObjectType()
export class AdminIconOption {
  @Field(() => String)
  value!: string;

  @Field(() => String)
  label!: string;
}

@ObjectType()
export class AdminCategoryMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
