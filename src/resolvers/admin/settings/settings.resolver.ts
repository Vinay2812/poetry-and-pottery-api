import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminSettingsMutationResponse,
  AdminSiteSetting,
  ContactInfo,
  HeroImages,
  SocialLinks,
  UpdateContactInfoInput,
  UpdateHeroImagesInput,
  UpdateSocialLinksInput,
} from "./settings.type";

// Setting keys
const SETTING_KEYS = {
  HERO_IMAGES: "hero_images",
  CONTACT_INFO: "contact_info",
  SOCIAL_LINKS: "social_links",
} as const;

// Default values
const DEFAULT_HERO_IMAGES: HeroImages = {
  home: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1920&q=80",
  ourStory:
    "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=1920&q=80",
  products:
    "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1920&q=80",
  events:
    "https://images.unsplash.com/photo-1614178060596-4a9c8a8c5b9c?w=1920&q=80",
};

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

async function getSetting<T>(
  ctx: Context,
  key: string,
  defaultValue: T,
): Promise<T> {
  const setting = await ctx.prisma.siteSetting.findUnique({
    where: { key },
  });

  if (setting && typeof setting.value === "object" && setting.value !== null) {
    return setting.value as T;
  }

  return defaultValue;
}

@Resolver()
export class AdminSettingsResolver {
  @Query(() => [AdminSiteSetting])
  @adminRequired()
  async adminAllSettings(@Ctx() ctx: Context): Promise<AdminSiteSetting[]> {
    const settings = await ctx.prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
    });

    return settings;
  }

  @Query(() => HeroImages)
  @adminRequired()
  async adminHeroImages(@Ctx() ctx: Context): Promise<HeroImages> {
    return getSetting(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES);
  }

  @Query(() => ContactInfo)
  @adminRequired()
  async adminContactInfo(@Ctx() ctx: Context): Promise<ContactInfo> {
    return getSetting(ctx, SETTING_KEYS.CONTACT_INFO, DEFAULT_CONTACT_INFO);
  }

  @Query(() => SocialLinks)
  @adminRequired()
  async adminSocialLinks(@Ctx() ctx: Context): Promise<SocialLinks> {
    return getSetting(ctx, SETTING_KEYS.SOCIAL_LINKS, DEFAULT_SOCIAL_LINKS);
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateHeroImages(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateHeroImagesInput) input: UpdateHeroImagesInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      const current = await getSetting(
        ctx,
        SETTING_KEYS.HERO_IMAGES,
        DEFAULT_HERO_IMAGES,
      );
      const updated = { ...current, ...input };

      await ctx.prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.HERO_IMAGES },
        create: { key: SETTING_KEYS.HERO_IMAGES, value: updated },
        update: { value: updated },
      });

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateContactInfo(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateContactInfoInput) input: UpdateContactInfoInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      const current = await getSetting(
        ctx,
        SETTING_KEYS.CONTACT_INFO,
        DEFAULT_CONTACT_INFO,
      );
      const updated = { ...current, ...input };

      await ctx.prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.CONTACT_INFO },
        create: { key: SETTING_KEYS.CONTACT_INFO, value: updated },
        update: { value: updated },
      });

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminSettingsMutationResponse)
  @adminRequired()
  async adminUpdateSocialLinks(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateSocialLinksInput) input: UpdateSocialLinksInput,
  ): Promise<AdminSettingsMutationResponse> {
    return tryCatchAsync(async () => {
      const current = await getSetting(
        ctx,
        SETTING_KEYS.SOCIAL_LINKS,
        DEFAULT_SOCIAL_LINKS,
      );
      const updated = { ...current, ...input };

      await ctx.prisma.siteSetting.upsert({
        where: { key: SETTING_KEYS.SOCIAL_LINKS },
        create: { key: SETTING_KEYS.SOCIAL_LINKS, value: updated },
        update: { value: updated },
      });

      return { success: true, error: null };
    });
  }

  // Public queries (no admin authentication required)
  @Query(() => HeroImages)
  async publicHeroImages(@Ctx() ctx: Context): Promise<HeroImages> {
    return getSetting(ctx, SETTING_KEYS.HERO_IMAGES, DEFAULT_HERO_IMAGES);
  }

  @Query(() => ContactInfo)
  async publicContactInfo(@Ctx() ctx: Context): Promise<ContactInfo> {
    return getSetting(ctx, SETTING_KEYS.CONTACT_INFO, DEFAULT_CONTACT_INFO);
  }

  @Query(() => SocialLinks)
  async publicSocialLinks(@Ctx() ctx: Context): Promise<SocialLinks> {
    return getSetting(ctx, SETTING_KEYS.SOCIAL_LINKS, DEFAULT_SOCIAL_LINKS);
  }
}
