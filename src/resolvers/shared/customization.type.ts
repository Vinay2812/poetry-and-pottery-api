import { Field, Float, Int, ObjectType } from "type-graphql";

@ObjectType()
export class CustomizationOptionSnapshot {
  @Field(() => String)
  type!: string;

  @Field(() => Int)
  optionId!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;

  @Field(() => Float)
  priceModifier!: number;
}

@ObjectType()
export class ProductCustomizationData {
  @Field(() => [CustomizationOptionSnapshot])
  options!: CustomizationOptionSnapshot[];

  @Field(() => Float)
  totalModifier!: number;
}
