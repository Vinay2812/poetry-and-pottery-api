import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// Hero Images
@ObjectType()
export class HeroImages {
  @Field(() => String)
  home!: string;

  @Field(() => String)
  ourStory!: string;

  @Field(() => String)
  products!: string;

  @Field(() => String)
  events!: string;
}

@InputType()
export class UpdateHeroImagesInput {
  @Field(() => String, { nullable: true })
  home?: string;

  @Field(() => String, { nullable: true })
  ourStory?: string;

  @Field(() => String, { nullable: true })
  products?: string;

  @Field(() => String, { nullable: true })
  events?: string;
}

// Contact Info
@ObjectType()
export class ContactInfo {
  @Field(() => String)
  address!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  hours!: string;
}

@InputType()
export class UpdateContactInfoInput {
  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  hours?: string;
}

// Social Links
@ObjectType()
export class SocialLinks {
  @Field(() => String)
  instagram!: string;

  @Field(() => String)
  facebook!: string;

  @Field(() => String)
  twitter!: string;

  @Field(() => String)
  pinterest!: string;
}

@InputType()
export class UpdateSocialLinksInput {
  @Field(() => String, { nullable: true })
  instagram?: string;

  @Field(() => String, { nullable: true })
  facebook?: string;

  @Field(() => String, { nullable: true })
  twitter?: string;

  @Field(() => String, { nullable: true })
  pinterest?: string;
}

// Setting value union type for type safety
export type SettingValue = HeroImages | ContactInfo | SocialLinks | Record<string, string>;

// Site Setting
@ObjectType()
export class AdminSiteSetting {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  key!: string;

  @Field(() => GraphQLJSON)
  value!: SettingValue;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

// Mutation response
@ObjectType()
export class AdminSettingsMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
