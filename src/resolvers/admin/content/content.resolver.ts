import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AboutPageContent,
  AdminContentMutationResponse,
  AdminContentPage,
  AdminContentPageListItem,
  CarePageContent,
  ContentPageContent,
  FAQPageContent,
  PrivacyPageContent,
  ShippingPageContent,
  TermsPageContent,
  UpdateContentPageInput,
} from "./content.type";

/**
 * Deep merge content with defaults - if a field is missing or empty in content,
 * use the value from defaults
 */
function mergeWithDefaults<T extends ContentPageContent>(
  content: Partial<T> | null | undefined,
  defaults: T,
): T {
  if (!content) {
    return defaults;
  }

  const result = { ...defaults } as T;

  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const contentValue = content[key];
    const defaultValue = defaults[key];

    if (contentValue === undefined || contentValue === null) {
      // Use default if content value is missing
      result[key] = defaultValue;
    } else if (Array.isArray(contentValue)) {
      // For arrays, use content if non-empty, otherwise use default
      result[key] = (contentValue.length > 0 ? contentValue : defaultValue) as T[keyof T];
    } else if (typeof contentValue === "object" && typeof defaultValue === "object") {
      // For nested objects, recursively merge
      result[key] = { ...defaultValue, ...contentValue } as T[keyof T];
    } else {
      // For primitives, use content value if it exists
      result[key] = contentValue as T[keyof T];
    }
  }

  return result;
}

type ContentPageType =
  | "about"
  | "faq"
  | "shipping"
  | "care"
  | "privacy"
  | "terms";

// Default content for each page type
const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  storyTitle: "Where Clay Meets Soul",
  storySubtitle: "Handcrafted Since 2018 - Over 5,000 pieces created with love",
  storyContent: [
    "Poetry & Pottery began in 2018 in a small garage studio, born from a simple belief: that handmade objects carry a special kind of magic.",
    "Today, we're a collective of passionate artisans dedicated to creating functional art that brings beauty to everyday moments.",
    "We believe that in a world of mass production, there's profound value in slowing down.",
  ],
  values: [
    {
      icon: "leaf",
      title: "Sustainable Craft",
      description:
        "We source our clay locally and use eco-friendly glazes. Every piece is made with respect for the earth.",
    },
    {
      icon: "heart",
      title: "Made with Love",
      description:
        "Each creation passes through the hands of our artisans who pour their passion into every detail.",
    },
  ],
  team: [
    {
      name: "Maya Thompson",
      role: "Founder & Lead Potter",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      bio: "With over 15 years at the wheel, Maya founded Poetry & Pottery to share her love of ceramic art.",
    },
  ],
  processSteps: [
    {
      step: "01",
      title: "Sourcing",
      description:
        "We carefully select locally-sourced clay, ensuring quality and sustainability in every batch.",
    },
    {
      step: "02",
      title: "Throwing",
      description:
        "Each piece is hand-thrown on the wheel, shaped by skilled hands with years of experience.",
    },
  ],
};

const DEFAULT_FAQ_CONTENT: FAQPageContent = {
  categories: [
    {
      title: "Orders & Shipping",
      faqs: [
        {
          question: "How long does shipping take?",
          answer:
            "Standard shipping takes 5-7 business days within India. Express shipping (2-3 business days) is also available.",
        },
      ],
    },
  ],
};

const DEFAULT_SHIPPING_CONTENT: ShippingPageContent = {
  shippingOptions: [
    {
      icon: "truck",
      title: "Standard Shipping",
      description: "5-7 business days",
      price: "Free on orders over ₹2,000",
    },
  ],
  shippingInfo: [
    {
      title: "Processing Time",
      content:
        "Orders are processed within 1-2 business days. During peak seasons, processing may take up to 3-4 business days.",
    },
  ],
  returnsPolicy: [
    {
      icon: "refresh-cw",
      title: "30-Day Returns",
      description:
        "Not satisfied? Return unused items within 30 days of delivery for a full refund.",
    },
  ],
  returnSteps: [
    {
      step: "01",
      title: "Contact Us",
      description: "Email us at returns@poetryandpottery.com within 30 days.",
    },
  ],
};

const DEFAULT_CARE_CONTENT: CarePageContent = {
  glazeTypes: [
    {
      name: "Matte Glazes",
      icon: "leaf",
      description:
        "Our signature matte finishes have a soft, velvety texture. They may show water spots more easily than glossy glazes.",
      care: "Hand wash and dry immediately for best results.",
    },
  ],
  warnings: [
    {
      icon: "alert-triangle",
      title: "Thermal Shock",
      description:
        "Never move pottery directly from refrigerator to oven or vice versa.",
    },
  ],
  safeFor: [
    "Dishwasher (top rack, most pieces)",
    "Microwave (no metallic glazes)",
  ],
  avoid: ["Direct flame or stovetop", "Sudden temperature changes"],
};

const DEFAULT_PRIVACY_CONTENT: PrivacyPageContent = {
  lastUpdated: "December 2024",
  introduction:
    "At Poetry & Pottery, we value your privacy and are committed to protecting your personal information.",
  sections: [
    {
      title: "Information We Collect",
      content:
        "We collect information you provide directly to us, such as when you create an account or make a purchase.",
    },
  ],
  contactEmail: "privacy@poetryandpottery.com",
};

const DEFAULT_TERMS_CONTENT: TermsPageContent = {
  lastUpdated: "December 2024",
  introduction:
    "Welcome to Poetry & Pottery. By accessing or using our website, you agree to be bound by these Terms of Service.",
  sections: [
    {
      title: "Acceptance of Terms",
      content:
        "By accessing and using this website, you accept and agree to be bound by these Terms of Service.",
    },
  ],
  contactEmail: "legal@poetryandpottery.com",
};

// Page configuration
const PAGE_CONFIG: Record<
  ContentPageType,
  {
    title: string;
    defaultContent:
      | AboutPageContent
      | FAQPageContent
      | ShippingPageContent
      | CarePageContent
      | PrivacyPageContent
      | TermsPageContent;
  }
> = {
  about: { title: "About Us", defaultContent: DEFAULT_ABOUT_CONTENT },
  faq: { title: "FAQ", defaultContent: DEFAULT_FAQ_CONTENT },
  shipping: {
    title: "Shipping & Returns",
    defaultContent: DEFAULT_SHIPPING_CONTENT,
  },
  care: { title: "Care Instructions", defaultContent: DEFAULT_CARE_CONTENT },
  privacy: { title: "Privacy Policy", defaultContent: DEFAULT_PRIVACY_CONTENT },
  terms: { title: "Terms of Service", defaultContent: DEFAULT_TERMS_CONTENT },
};

@Resolver()
export class AdminContentResolver {
  @Query(() => [AdminContentPageListItem])
  @adminRequired()
  async adminContentPages(
    @Ctx() ctx: Context,
  ): Promise<AdminContentPageListItem[]> {
    const pages = await ctx.prisma.contentPage.findMany({
      select: {
        slug: true,
        title: true,
        is_active: true,
        updated_at: true,
      },
      orderBy: { slug: "asc" },
    });

    // Merge with default pages
    const existingPages = new Map(pages.map((p) => [p.slug, p]));
    const allPages: AdminContentPageListItem[] = [];

    for (const [slug, config] of Object.entries(PAGE_CONFIG)) {
      const existing = existingPages.get(slug);
      allPages.push({
        slug,
        title: config.title,
        is_active: existing?.is_active ?? true,
        updated_at: existing?.updated_at ?? new Date(),
      });
    }

    return allPages;
  }

  @Query(() => AdminContentPage, { nullable: true })
  @adminRequired()
  async adminContentPageBySlug(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
  ): Promise<AdminContentPage | null> {
    const config = PAGE_CONFIG[slug as ContentPageType];
    if (!config) {
      return null;
    }

    const page = await ctx.prisma.contentPage.findUnique({
      where: { slug },
    });

    if (page) {
      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        // Merge stored content with defaults - missing fields fallback to defaults
        content: mergeWithDefaults(
          page.content as ContentPageContent,
          config.defaultContent,
        ),
        is_active: page.is_active,
        created_at: page.created_at,
        updated_at: page.updated_at,
      };
    }

    // Return default content if page doesn't exist in DB
    return {
      id: 0,
      slug,
      title: config.title,
      content: config.defaultContent,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  @Mutation(() => AdminContentMutationResponse)
  @adminRequired()
  async adminUpdateContentPage(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
    @Arg("input", () => UpdateContentPageInput) input: UpdateContentPageInput,
  ): Promise<AdminContentMutationResponse> {
    return tryCatchAsync(async () => {
      const config = PAGE_CONFIG[slug as ContentPageType];
      if (!config) {
        return { success: false, error: "Invalid page slug" };
      }

      await ctx.prisma.contentPage.upsert({
        where: { slug },
        create: {
          slug,
          title: config.title,
          content: input.content as PrismaJson.ContentBlocks,
          is_active: true,
        },
        update: {
          content: input.content as PrismaJson.ContentBlocks,
        },
      });

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminContentMutationResponse)
  @adminRequired()
  async adminToggleContentPageActive(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
  ): Promise<AdminContentMutationResponse> {
    return tryCatchAsync(async () => {
      const config = PAGE_CONFIG[slug as ContentPageType];
      if (!config) {
        return { success: false, error: "Invalid page slug" };
      }

      const existing = await ctx.prisma.contentPage.findUnique({
        where: { slug },
      });

      if (existing) {
        await ctx.prisma.contentPage.update({
          where: { slug },
          data: { is_active: !existing.is_active },
        });
      } else {
        await ctx.prisma.contentPage.create({
          data: {
            slug,
            title: config.title,
            content: config.defaultContent as PrismaJson.ContentBlocks,
            is_active: false,
          },
        });
      }

      return { success: true, error: null };
    });
  }

  // Public content queries (no admin authentication required)
  private async getPublicContent(
    ctx: Context,
    slug: ContentPageType,
  ): Promise<ContentPageContent | null> {
    const config = PAGE_CONFIG[slug];
    if (!config) {
      return null;
    }

    const page = await ctx.prisma.contentPage.findFirst({
      where: { slug, is_active: true },
      select: { content: true },
    });

    // Merge stored content with defaults - missing fields fallback to defaults
    return mergeWithDefaults(
      page?.content as ContentPageContent | null,
      config.defaultContent,
    );
  }

  @Query(() => AboutPageContent, { nullable: true })
  async publicAboutContent(
    @Ctx() ctx: Context,
  ): Promise<AboutPageContent | null> {
    return this.getPublicContent(
      ctx,
      "about",
    ) as Promise<AboutPageContent | null>;
  }

  @Query(() => FAQPageContent, { nullable: true })
  async publicFAQContent(@Ctx() ctx: Context): Promise<FAQPageContent | null> {
    return this.getPublicContent(ctx, "faq") as Promise<FAQPageContent | null>;
  }

  @Query(() => ShippingPageContent, { nullable: true })
  async publicShippingContent(
    @Ctx() ctx: Context,
  ): Promise<ShippingPageContent | null> {
    return this.getPublicContent(
      ctx,
      "shipping",
    ) as Promise<ShippingPageContent | null>;
  }

  @Query(() => CarePageContent, { nullable: true })
  async publicCareContent(
    @Ctx() ctx: Context,
  ): Promise<CarePageContent | null> {
    return this.getPublicContent(
      ctx,
      "care",
    ) as Promise<CarePageContent | null>;
  }

  @Query(() => PrivacyPageContent, { nullable: true })
  async publicPrivacyContent(
    @Ctx() ctx: Context,
  ): Promise<PrivacyPageContent | null> {
    return this.getPublicContent(
      ctx,
      "privacy",
    ) as Promise<PrivacyPageContent | null>;
  }

  @Query(() => TermsPageContent, { nullable: true })
  async publicTermsContent(
    @Ctx() ctx: Context,
  ): Promise<TermsPageContent | null> {
    return this.getPublicContent(
      ctx,
      "terms",
    ) as Promise<TermsPageContent | null>;
  }
}
