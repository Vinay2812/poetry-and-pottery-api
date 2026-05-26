import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  DEFAULT_BRAND_ASSETS,
  DEFAULT_FOOTER_CONTENT,
  DEFAULT_HERO_IMAGES,
  DEFAULT_HERO_VIDEOS,
  DEFAULT_PAGE_TAGLINES,
  DEFAULT_SEO_METADATA,
  PageSlug,
  SETTING_KEYS,
  SITE_CONTENT_DEFAULTS,
} from "./defaults";
import { deepMergeDefaults } from "./merge";
import {
  AdminSettingsMutationResponse,
  BrandAssets,
  ContactInfo,
  FooterContent,
  HeroImages,
  HeroVideos,
  PageContent,
  PageTaglines,
  SeoMetadata,
  SiteContentDefaults,
  SocialLinks,
  UpdateBrandAssetsInput,
  UpdateContactInfoInput,
  UpdateFooterContentInput,
  UpdateHeroImagesInput,
  UpdateHeroVideosInput,
  UpdatePageTaglinesInput,
  UpdateSeoMetadataInput,
  UpdateSocialLinksInput,
} from "./settings.type";

const DEFAULT_CONTACT_INFO: ContactInfo = {
  address: "123 Potter's Lane, Artisan District",
  email: "hello@poetryandpottery.com",
  phone: "+91 98765 43210",
  hours: "Mon-Sat, 10am - 6pm",
};

const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: "https://instagram.com/poetryandpottery",
  facebook: "https://facebook.com/poetryandpottery",
  twitter: "https://twitter.com/poetryandpottery",
  pinterest: "https://pinterest.com/poetryandpottery",
};

async function readMerged<T>(
  ctx: Context,
  key: string,
  defaults: T,
): Promise<T> {
  const row = await ctx.prisma.siteSetting.findUnique({ where: { key } });
  return deepMergeDefaults(defaults, row?.value ?? null);
}

async function writeMerged<T>(
  ctx: Context,
  key: string,
  defaults: T,
  partial: unknown,
): Promise<void> {
  const current = await readMerged(ctx, key, defaults);
  const next = deepMergeDefaults(current, partial);
  const value = next as unknown as PrismaJson.SettingValue;
  await ctx.prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

@Resolver()
export class AdminSettingsResolver {
  // ===== Hero Images =====
  @Query(() => HeroImages)
  @adminRequired()
  async adminHeroImages(@Ctx() ctx: Context): Promise<HeroImages> {
    return readMerged(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES);
  }

  @Query(() => HeroImages)
  async heroImages(@Ctx() ctx: Context): Promise<HeroImages> {
    return readMerged(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateHeroImages(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateHeroImagesInput) input: UpdateHeroImagesInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.HERO_IMAGES,
        DEFAULT_HERO_IMAGES,
        input,
      );
      return { success: true, error: null };
    });
  }

  // ===== Hero Videos =====
  @Query(() => HeroVideos)
  @adminRequired()
  async adminHeroVideos(@Ctx() ctx: Context): Promise<HeroVideos> {
    return readMerged(ctx, SETTING_KEYS.HERO_VIDEOS, DEFAULT_HERO_VIDEOS);
  }

  @Query(() => HeroVideos)
  async heroVideos(@Ctx() ctx: Context): Promise<HeroVideos> {
    return readMerged(ctx, SETTING_KEYS.HERO_VIDEOS, DEFAULT_HERO_VIDEOS);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateHeroVideos(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateHeroVideosInput) input: UpdateHeroVideosInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.HERO_VIDEOS,
        DEFAULT_HERO_VIDEOS,
        input,
      );
      return { success: true, error: null };
    });
  }

  // ===== Brand Assets =====
  @Query(() => BrandAssets)
  @adminRequired()
  async adminBrandAssets(@Ctx() ctx: Context): Promise<BrandAssets> {
    return readMerged(ctx, SETTING_KEYS.BRAND_ASSETS, DEFAULT_BRAND_ASSETS);
  }

  @Query(() => BrandAssets)
  async brandAssets(@Ctx() ctx: Context): Promise<BrandAssets> {
    return readMerged(ctx, SETTING_KEYS.BRAND_ASSETS, DEFAULT_BRAND_ASSETS);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateBrandAssets(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateBrandAssetsInput) input: UpdateBrandAssetsInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.BRAND_ASSETS,
        DEFAULT_BRAND_ASSETS,
        input,
      );
      return { success: true, error: null };
    });
  }

  // ===== SEO Metadata =====
  @Query(() => SeoMetadata)
  @adminRequired()
  async adminSeoMetadata(@Ctx() ctx: Context): Promise<SeoMetadata> {
    const entries = await readMerged(
      ctx,
      SETTING_KEYS.SEO_METADATA,
      DEFAULT_SEO_METADATA,
    );
    return { entries };
  }

  @Query(() => SeoMetadata)
  async seoMetadata(@Ctx() ctx: Context): Promise<SeoMetadata> {
    const entries = await readMerged(
      ctx,
      SETTING_KEYS.SEO_METADATA,
      DEFAULT_SEO_METADATA,
    );
    return { entries };
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateSeoMetadata(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateSeoMetadataInput) input: UpdateSeoMetadataInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(ctx, SETTING_KEYS.SEO_METADATA, DEFAULT_SEO_METADATA, {
        [input.page]: input.entry,
      });
      return { success: true, error: null };
    });
  }

  // ===== Footer Content =====
  @Query(() => FooterContent)
  @adminRequired()
  async adminFooterContent(@Ctx() ctx: Context): Promise<FooterContent> {
    return readMerged(ctx, SETTING_KEYS.FOOTER_CONTENT, DEFAULT_FOOTER_CONTENT);
  }

  @Query(() => FooterContent)
  async footerContent(@Ctx() ctx: Context): Promise<FooterContent> {
    return readMerged(ctx, SETTING_KEYS.FOOTER_CONTENT, DEFAULT_FOOTER_CONTENT);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateFooterContent(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateFooterContentInput)
    input: UpdateFooterContentInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.FOOTER_CONTENT,
        DEFAULT_FOOTER_CONTENT,
        input,
      );
      return { success: true, error: null };
    });
  }

  // ===== Page Taglines =====
  @Query(() => PageTaglines)
  @adminRequired()
  async adminPageTaglines(@Ctx() ctx: Context): Promise<PageTaglines> {
    const entries = await readMerged(
      ctx,
      SETTING_KEYS.PAGE_TAGLINES,
      DEFAULT_PAGE_TAGLINES,
    );
    return { entries };
  }

  @Query(() => PageTaglines)
  async pageTaglines(@Ctx() ctx: Context): Promise<PageTaglines> {
    const entries = await readMerged(
      ctx,
      SETTING_KEYS.PAGE_TAGLINES,
      DEFAULT_PAGE_TAGLINES,
    );
    return { entries };
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdatePageTaglines(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdatePageTaglinesInput) input: UpdatePageTaglinesInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.PAGE_TAGLINES,
        DEFAULT_PAGE_TAGLINES,
        { [input.page]: input.entry },
      );
      return { success: true, error: null };
    });
  }

  // ===== Contact / Social (preserved from previous resolver) =====
  @Query(() => ContactInfo)
  @adminRequired()
  async adminContactInfo(@Ctx() ctx: Context): Promise<ContactInfo> {
    return readMerged(ctx, SETTING_KEYS.CONTACT_INFO, DEFAULT_CONTACT_INFO);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateContactInfo(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateContactInfoInput) input: UpdateContactInfoInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.CONTACT_INFO,
        DEFAULT_CONTACT_INFO,
        input,
      );
      return { success: true, error: null };
    });
  }

  @Query(() => SocialLinks)
  @adminRequired()
  async adminSocialLinks(@Ctx() ctx: Context): Promise<SocialLinks> {
    return readMerged(ctx, SETTING_KEYS.SOCIAL_LINKS, DEFAULT_SOCIAL_LINKS);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateSocialLinks(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateSocialLinksInput) input: UpdateSocialLinksInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      await writeMerged(
        ctx,
        SETTING_KEYS.SOCIAL_LINKS,
        DEFAULT_SOCIAL_LINKS,
        input,
      );
      return { success: true, error: null };
    });
  }

  // Preserved public alias from previous resolver (do not break existing callers)
  @Query(() => HeroImages)
  async publicHeroImages(@Ctx() ctx: Context): Promise<HeroImages> {
    return readMerged(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES);
  }

  // ===== Aggregators =====
  @Query(() => PageContent)
  async pageContent(
    @Ctx() ctx: Context,
    @Arg("pageSlug", () => String) pageSlug: string,
  ): Promise<PageContent> {
    const slug = pageSlug as PageSlug;
    const [heroes, videos, seo, taglines] = await Promise.all([
      readMerged(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES),
      readMerged(ctx, SETTING_KEYS.HERO_VIDEOS, DEFAULT_HERO_VIDEOS),
      readMerged(ctx, SETTING_KEYS.SEO_METADATA, DEFAULT_SEO_METADATA),
      readMerged(ctx, SETTING_KEYS.PAGE_TAGLINES, DEFAULT_PAGE_TAGLINES),
    ]);
    const heroVideo = slug === "home" ? videos.home : null;
    return {
      hero: heroes[slug] ?? heroes.home,
      video: heroVideo,
      seo: seo[slug] ?? seo.home,
      tagline: taglines[slug] ?? taglines.home,
    };
  }

  @Query(() => PageContent)
  @adminRequired()
  async adminPageContent(
    @Ctx() ctx: Context,
    @Arg("pageSlug", () => String) pageSlug: string,
  ): Promise<PageContent> {
    return this.pageContent(ctx, pageSlug);
  }

  // ===== Defaults registry exposure =====
  @Query(() => SiteContentDefaults)
  @adminRequired()
  async siteContentDefaults(): Promise<SiteContentDefaults> {
    return {
      value: SITE_CONTENT_DEFAULTS as unknown as Record<string, unknown>,
    };
  }
}
