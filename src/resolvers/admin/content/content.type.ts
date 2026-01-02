import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// About Page Content Types
@ObjectType()
export class AboutValue {
  @Field(() => String)
  icon!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class AboutTeamMember {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  image!: string;

  @Field(() => String)
  bio!: string;
}

@ObjectType()
export class AboutProcessStep {
  @Field(() => String)
  step!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class AboutPageContent {
  @Field(() => String)
  storyTitle!: string;

  @Field(() => String)
  storySubtitle!: string;

  @Field(() => [String])
  storyContent!: string[];

  @Field(() => [AboutValue])
  values!: AboutValue[];

  @Field(() => [AboutTeamMember])
  team!: AboutTeamMember[];

  @Field(() => [AboutProcessStep])
  processSteps!: AboutProcessStep[];
}

// FAQ Page Content Types
@ObjectType()
export class FAQItem {
  @Field(() => String)
  question!: string;

  @Field(() => String)
  answer!: string;
}

@ObjectType()
export class FAQCategory {
  @Field(() => String)
  title!: string;

  @Field(() => [FAQItem])
  faqs!: FAQItem[];
}

@ObjectType()
export class FAQPageContent {
  @Field(() => [FAQCategory])
  categories!: FAQCategory[];
}

// Shipping Page Content Types
@ObjectType()
export class ShippingOption {
  @Field(() => String)
  icon!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  price!: string;
}

@ObjectType()
export class ShippingInfo {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;
}

@ObjectType()
export class ReturnsPolicy {
  @Field(() => String)
  icon!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class ReturnStep {
  @Field(() => String)
  step!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class ShippingPageContent {
  @Field(() => [ShippingOption])
  shippingOptions!: ShippingOption[];

  @Field(() => [ShippingInfo])
  shippingInfo!: ShippingInfo[];

  @Field(() => [ReturnsPolicy])
  returnsPolicy!: ReturnsPolicy[];

  @Field(() => [ReturnStep])
  returnSteps!: ReturnStep[];
}

// Care Page Content Types
@ObjectType()
export class GlazeType {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  icon!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  care!: string;
}

@ObjectType()
export class CareWarning {
  @Field(() => String)
  icon!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class CarePageContent {
  @Field(() => [GlazeType])
  glazeTypes!: GlazeType[];

  @Field(() => [CareWarning])
  warnings!: CareWarning[];

  @Field(() => [String])
  safeFor!: string[];

  @Field(() => [String])
  avoid!: string[];
}

// Privacy Policy Page Content Types
@ObjectType()
export class PrivacySection {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;
}

@ObjectType()
export class PrivacyPageContent {
  @Field(() => String)
  lastUpdated!: string;

  @Field(() => String)
  introduction!: string;

  @Field(() => [PrivacySection])
  sections!: PrivacySection[];

  @Field(() => String)
  contactEmail!: string;
}

// Terms of Service Page Content Types
@ObjectType()
export class TermsSection {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;
}

@ObjectType()
export class TermsPageContent {
  @Field(() => String)
  lastUpdated!: string;

  @Field(() => String)
  introduction!: string;

  @Field(() => [TermsSection])
  sections!: TermsSection[];

  @Field(() => String)
  contactEmail!: string;
}

// Content Page List Item (for list view)
@ObjectType()
export class AdminContentPageListItem {
  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

// Content union type for type safety
export type ContentPageContent =
  | AboutPageContent
  | FAQPageContent
  | ShippingPageContent
  | CarePageContent
  | PrivacyPageContent
  | TermsPageContent;

// Content Page with JSON content
@ObjectType()
export class AdminContentPage {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => GraphQLJSON)
  content!: ContentPageContent;

  @Field(() => Boolean)
  is_active!: boolean;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;
}

// Input types for mutations
@InputType()
export class UpdateContentPageInput {
  @Field(() => GraphQLJSON)
  content!: ContentPageContent;
}

// Mutation response
@ObjectType()
export class AdminContentMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
