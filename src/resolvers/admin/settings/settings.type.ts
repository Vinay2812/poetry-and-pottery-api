import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { Field, InputType, Int, ObjectType } from "type-graphql";

// Hero Images
@ObjectType()
export class HeroImages {
  @Field(() => String) home!: string;
  @Field(() => String) store!: string;
  @Field(() => String) events!: string;
  @Field(() => String) about!: string;
  @Field(() => String) contact!: string;
  @Field(() => String) faq!: string;
  @Field(() => String) shipping!: string;
  @Field(() => String) care!: string;
  @Field(() => String) privacy!: string;
  @Field(() => String) terms!: string;
  @Field(() => String) customize!: string;
  @Field(() => String) ourStory!: string;
}

@InputType()
export class UpdateHeroImagesInput {
  @Field(() => String, { nullable: true }) home?: string;
  @Field(() => String, { nullable: true }) store?: string;
  @Field(() => String, { nullable: true }) events?: string;
  @Field(() => String, { nullable: true }) about?: string;
  @Field(() => String, { nullable: true }) contact?: string;
  @Field(() => String, { nullable: true }) faq?: string;
  @Field(() => String, { nullable: true }) shipping?: string;
  @Field(() => String, { nullable: true }) care?: string;
  @Field(() => String, { nullable: true }) privacy?: string;
  @Field(() => String, { nullable: true }) terms?: string;
  @Field(() => String, { nullable: true }) customize?: string;
  @Field(() => String, { nullable: true }) ourStory?: string;
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
export type SettingValue =
  | HeroImages
  | ContactInfo
  | SocialLinks
  | Record<string, string>;

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

// ---------- Hero Videos ----------
@ObjectType()
export class HeroVideoEntry {
  @Field(() => String) src!: string;
  @Field(() => String) poster!: string;
}

@ObjectType()
export class HeroVideos {
  @Field(() => HeroVideoEntry) home!: HeroVideoEntry;
}

@InputType()
export class HeroVideoEntryInput {
  @Field(() => String, { nullable: true }) src?: string;
  @Field(() => String, { nullable: true }) poster?: string;
}

@InputType()
export class UpdateHeroVideosInput {
  @Field(() => HeroVideoEntryInput, { nullable: true })
  home?: HeroVideoEntryInput;
}

// ---------- Brand Assets ----------
@ObjectType()
export class BrandAssets {
  @Field(() => String) logo!: string;
  @Field(() => String) logoDark!: string;
  @Field(() => String) favicon!: string;
  @Field(() => String) appleTouchIcon!: string;
  @Field(() => String) defaultOgImage!: string;
}

@InputType()
export class UpdateBrandAssetsInput {
  @Field(() => String, { nullable: true }) logo?: string;
  @Field(() => String, { nullable: true }) logoDark?: string;
  @Field(() => String, { nullable: true }) favicon?: string;
  @Field(() => String, { nullable: true }) appleTouchIcon?: string;
  @Field(() => String, { nullable: true }) defaultOgImage?: string;
}

// ---------- SEO Metadata ----------
@ObjectType()
export class SeoEntry {
  @Field(() => String) title!: string;
  @Field(() => String) description!: string;
  @Field(() => String) ogImage!: string;
  @Field(() => String) ogTitle!: string;
  @Field(() => String) ogDescription!: string;
}

@ObjectType()
export class SeoMetadata {
  @Field(() => GraphQLJSON) entries!: Record<string, SeoEntry>;
}

@InputType()
export class SeoEntryInput {
  @Field(() => String, { nullable: true }) title?: string;
  @Field(() => String, { nullable: true }) description?: string;
  @Field(() => String, { nullable: true }) ogImage?: string;
  @Field(() => String, { nullable: true }) ogTitle?: string;
  @Field(() => String, { nullable: true }) ogDescription?: string;
}

@InputType()
export class UpdateSeoMetadataInput {
  @Field(() => String) page!: string;
  @Field(() => SeoEntryInput) entry!: SeoEntryInput;
}

// ---------- Footer Content ----------
@ObjectType()
export class FooterLink {
  @Field(() => String) label!: string;
  @Field(() => String) href!: string;
}

@ObjectType()
export class FooterColumn {
  @Field(() => String) title!: string;
  @Field(() => [FooterLink]) links!: FooterLink[];
}

@ObjectType()
export class FooterContent {
  @Field(() => String) tagline!: string;
  @Field(() => String) copyright!: string;
  @Field(() => String) newsletterBlurb!: string;
  @Field(() => [FooterColumn]) columns!: FooterColumn[];
}

@InputType()
export class FooterLinkInput {
  @Field(() => String) label!: string;
  @Field(() => String) href!: string;
}

@InputType()
export class FooterColumnInput {
  @Field(() => String) title!: string;
  @Field(() => [FooterLinkInput]) links!: FooterLinkInput[];
}

@InputType()
export class UpdateFooterContentInput {
  @Field(() => String, { nullable: true }) tagline?: string;
  @Field(() => String, { nullable: true }) copyright?: string;
  @Field(() => String, { nullable: true }) newsletterBlurb?: string;
  @Field(() => [FooterColumnInput], { nullable: true })
  columns?: FooterColumnInput[];
}

// ---------- Page Taglines ----------
@ObjectType()
export class TaglineEntry {
  @Field(() => String) heading!: string;
  @Field(() => String) subheading!: string;
  @Field(() => String) ctaText!: string;
}

@ObjectType()
export class PageTaglines {
  @Field(() => GraphQLJSON) entries!: Record<string, TaglineEntry>;
}

@InputType()
export class TaglineEntryInput {
  @Field(() => String, { nullable: true }) heading?: string;
  @Field(() => String, { nullable: true }) subheading?: string;
  @Field(() => String, { nullable: true }) ctaText?: string;
}

@InputType()
export class UpdatePageTaglinesInput {
  @Field(() => String) page!: string;
  @Field(() => TaglineEntryInput) entry!: TaglineEntryInput;
}

// ---------- Aggregator ----------
@ObjectType()
export class PageContent {
  @Field(() => String) hero!: string;
  @Field(() => HeroVideoEntry, { nullable: true })
  video?: HeroVideoEntry | null;
  @Field(() => SeoEntry) seo!: SeoEntry;
  @Field(() => TaglineEntry) tagline!: TaglineEntry;
}

// ---------- Defaults envelope ----------
@ObjectType()
export class SiteContentDefaults {
  @Field(() => GraphQLJSON) value!: Record<string, unknown>;
}

// Mutation response
@ObjectType()
export class AdminSettingsMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
