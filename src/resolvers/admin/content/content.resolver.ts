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
      result[key] = (
        contentValue.length > 0 ? contentValue : defaultValue
      ) as T[keyof T];
    } else if (
      typeof contentValue === "object" &&
      typeof defaultValue === "object"
    ) {
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
    "We believe that in a world of mass production, there's profound value in slowing down. Each piece we create tells a story—of the earth it came from, the hands that shaped it, and the home it will become part of.",
    "Our studio has grown from that humble garage to a sunlit workshop where creativity flows as freely as the clay on our wheels. We've welcomed apprentices, hosted countless workshops, and shipped our creations to homes across India and beyond.",
    "What hasn't changed is our commitment to the craft. Every piece is still touched by human hands, still fired in our kilns, still inspected with the same critical eye that Maya brought to her very first creation.",
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
    {
      icon: "users",
      title: "Community First",
      description:
        "We believe in nurturing the next generation of potters through workshops, apprenticeships, and open studio days.",
    },
    {
      icon: "sparkles",
      title: "Timeless Design",
      description:
        "Our pieces blend traditional techniques with contemporary aesthetics, creating objects that feel both familiar and fresh.",
    },
  ],
  team: [
    {
      name: "Maya Thompson",
      role: "Founder & Lead Potter",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      bio: "With over 15 years at the wheel, Maya founded Poetry & Pottery to share her love of ceramic art. Her signature style combines organic forms with functional design.",
    },
    {
      name: "Arjun Mehta",
      role: "Master Glazer",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      bio: "Arjun brings 12 years of experience in glaze chemistry. His innovative color palettes have become a hallmark of our collection.",
    },
    {
      name: "Priya Sharma",
      role: "Studio Manager & Potter",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
      bio: "Priya ensures our studio runs smoothly while creating her own line of decorative pieces. She specializes in intricate surface textures.",
    },
    {
      name: "Kiran Reddy",
      role: "Apprentice Potter",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      bio: "The newest member of our team, Kiran brings fresh perspectives and boundless enthusiasm. He's quickly mastering the art of wheel throwing.",
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
    {
      step: "03",
      title: "Trimming",
      description:
        "Once leather-hard, each piece is carefully trimmed to refine its shape and add foot rings or decorative elements.",
    },
    {
      step: "04",
      title: "Bisque Firing",
      description:
        "The first firing transforms raw clay into durable ceramic, preparing it for glazing.",
    },
    {
      step: "05",
      title: "Glazing",
      description:
        "Our signature glazes are hand-mixed and applied with brushes, dipping, or pouring techniques.",
    },
    {
      step: "06",
      title: "Final Firing",
      description:
        "The glaze firing brings each piece to life, with colors developing at temperatures over 1200°C.",
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
            "Standard shipping takes 5-7 business days within India. Express shipping (2-3 business days) is also available at checkout.",
        },
        {
          question: "Do you ship internationally?",
          answer:
            "Yes! We ship to select countries. International orders typically take 10-15 business days. Shipping costs are calculated at checkout based on destination and package weight.",
        },
        {
          question: "How is my order packaged?",
          answer:
            "Each piece is carefully wrapped in biodegradable tissue, cushioned with recycled paper, and placed in a sturdy box. We take extra care to ensure your pottery arrives safely.",
        },
        {
          question: "Can I track my order?",
          answer:
            "Absolutely! Once your order ships, you'll receive an email with tracking information. You can also track your order through your account dashboard.",
        },
      ],
    },
    {
      title: "Products & Care",
      faqs: [
        {
          question: "Are your products food-safe?",
          answer:
            "Yes, all our functional pottery is made with food-safe glazes and is safe for everyday use. Decorative pieces are clearly marked as such.",
        },
        {
          question: "Can I put your pottery in the dishwasher?",
          answer:
            "Most of our pieces are dishwasher-safe (top rack recommended). However, hand washing is always gentler and helps preserve the glaze longer. Check the product description for specific care instructions.",
        },
        {
          question: "Are your pieces microwave-safe?",
          answer:
            "Most pieces without metallic glazes are microwave-safe. Always check for any metallic lusters or decorations before microwaving. Never microwave pieces with gold or platinum accents.",
        },
        {
          question: "How do I care for my pottery?",
          answer:
            "Avoid sudden temperature changes (thermal shock), hand wash when possible, and store carefully to prevent chipping. See our Care Instructions page for detailed guidance.",
        },
      ],
    },
    {
      title: "Returns & Exchanges",
      faqs: [
        {
          question: "What is your return policy?",
          answer:
            "We offer a 30-day return policy for unused items in original packaging. Custom or personalized pieces cannot be returned unless defective.",
        },
        {
          question: "What if my item arrives damaged?",
          answer:
            "We're so sorry if that happens! Please contact us within 48 hours of delivery with photos of the damage. We'll arrange a replacement or full refund at no extra cost.",
        },
        {
          question: "Can I exchange an item for a different color or size?",
          answer:
            "Yes, exchanges are welcome within 30 days. Simply contact us to initiate an exchange. You'll be responsible for return shipping unless the exchange is due to our error.",
        },
      ],
    },
    {
      title: "Workshops & Events",
      faqs: [
        {
          question: "Do you offer pottery workshops?",
          answer:
            "Yes! We host regular workshops for all skill levels, from beginner wheel-throwing classes to advanced glazing techniques. Check our Events page for upcoming sessions.",
        },
        {
          question: "Can I book a private workshop?",
          answer:
            "Absolutely! Private workshops are perfect for team building, birthdays, or special occasions. Contact us to discuss your needs and we'll create a custom experience.",
        },
        {
          question: "What should I wear to a workshop?",
          answer:
            "Wear comfortable clothes that can get dirty—clay has a way of finding its way onto everything! We provide aprons, but closed-toe shoes are recommended.",
        },
      ],
    },
    {
      title: "Custom Orders",
      faqs: [
        {
          question: "Do you accept custom orders?",
          answer:
            "Yes, we love bringing your ideas to life! Custom orders typically take 4-6 weeks depending on complexity. Contact us with your vision and we'll provide a quote.",
        },
        {
          question: "Can you match a specific color?",
          answer:
            "We can often create custom glazes to match your color preferences. Keep in mind that handmade glazes may have natural variations that add to their beauty.",
        },
        {
          question: "Do you offer wholesale or bulk orders?",
          answer:
            "Yes, we work with restaurants, hotels, and retailers. Minimum order quantities apply. Contact us at wholesale@poetryandpottery.com for pricing and details.",
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
    {
      icon: "zap",
      title: "Express Shipping",
      description: "2-3 business days",
      price: "₹199 flat rate",
    },
    {
      icon: "globe",
      title: "International Shipping",
      description: "10-15 business days",
      price: "Calculated at checkout",
    },
  ],
  shippingInfo: [
    {
      title: "Processing Time",
      content:
        "Orders are processed within 1-2 business days. During peak seasons or for custom orders, processing may take up to 3-4 business days.",
    },
    {
      title: "Order Tracking",
      content:
        "Once your order ships, you'll receive a confirmation email with tracking information. You can also track your order through your account dashboard.",
    },
    {
      title: "Packaging",
      content:
        "We take great care in packaging your pottery. Each piece is wrapped in biodegradable tissue, cushioned with recycled paper, and placed in sturdy boxes designed for fragile items.",
    },
    {
      title: "Delivery Areas",
      content:
        "We deliver to all major cities in India and select international destinations. Remote areas may require additional delivery time.",
    },
  ],
  returnsPolicy: [
    {
      icon: "refresh-cw",
      title: "30-Day Returns",
      description:
        "Not satisfied? Return unused items within 30 days of delivery for a full refund.",
    },
    {
      icon: "shield",
      title: "Damage Protection",
      description:
        "If your item arrives damaged, contact us within 48 hours for a free replacement or refund.",
    },
    {
      icon: "repeat",
      title: "Easy Exchanges",
      description:
        "Want a different color or size? We make exchanges simple and hassle-free.",
    },
  ],
  returnSteps: [
    {
      step: "01",
      title: "Contact Us",
      description:
        "Email us at returns@poetryandpottery.com within 30 days of delivery with your order number and reason for return.",
    },
    {
      step: "02",
      title: "Get Approval",
      description:
        "We'll review your request and send you a return authorization along with shipping instructions.",
    },
    {
      step: "03",
      title: "Ship It Back",
      description:
        "Pack your item securely in its original packaging and ship it to our returns center.",
    },
    {
      step: "04",
      title: "Receive Refund",
      description:
        "Once we receive and inspect your return, we'll process your refund within 5-7 business days.",
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
      care: "Hand wash and dry immediately for best results. Use a soft cloth to maintain the smooth finish.",
    },
    {
      name: "Glossy Glazes",
      icon: "sparkles",
      description:
        "Our high-shine glazes are durable and easy to clean. They resist staining and are perfect for everyday use.",
      care: "Dishwasher safe on top rack. Avoid abrasive scrubbers that may scratch the surface.",
    },
    {
      name: "Reactive Glazes",
      icon: "palette",
      description:
        "These artistic glazes create unique patterns where colors blend and flow. Each piece is truly one-of-a-kind.",
      care: "Hand wash recommended to preserve the unique patterns. Some color variation is normal and adds character.",
    },
    {
      name: "Unglazed/Raw Clay",
      icon: "layers",
      description:
        "Some pieces feature exposed clay for a natural, earthy aesthetic. These areas are porous and require special care.",
      care: "Keep dry when not in use. Season with food-safe oil occasionally. Not recommended for liquids.",
    },
  ],
  warnings: [
    {
      icon: "alert-triangle",
      title: "Thermal Shock",
      description:
        "Never move pottery directly from refrigerator to oven or vice versa. Allow pieces to come to room temperature first.",
    },
    {
      icon: "flame",
      title: "Direct Heat",
      description:
        "Never place pottery directly on stovetop burners or open flames. Our pieces are oven-safe but not stovetop-safe.",
    },
    {
      icon: "droplets",
      title: "Prolonged Soaking",
      description:
        "Avoid leaving pieces soaking in water for extended periods, especially those with unglazed areas.",
    },
    {
      icon: "hammer",
      title: "Impact Damage",
      description:
        "Handle with care. Chips and cracks can develop from impacts. Store pieces with padding between them.",
    },
  ],
  safeFor: [
    "Dishwasher (top rack, most pieces)",
    "Microwave (no metallic glazes)",
    "Oven up to 220°C (check product details)",
    "Refrigerator and freezer",
    "Food storage and serving",
  ],
  avoid: [
    "Direct flame or stovetop",
    "Sudden temperature changes",
    "Abrasive cleaners or scrubbers",
    "Prolonged soaking in water",
    "Stacking without protection",
  ],
};

const DEFAULT_PRIVACY_CONTENT: PrivacyPageContent = {
  lastUpdated: "January 2025",
  introduction:
    "At Poetry & Pottery, we value your privacy and are committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data when you visit our website or make a purchase.",
  sections: [
    {
      title: "Information We Collect",
      content:
        "We collect information you provide directly to us, such as when you create an account, make a purchase, sign up for our newsletter, or contact us. This may include your name, email address, shipping address, phone number, and payment information.",
    },
    {
      title: "How We Use Your Information",
      content:
        "We use your information to process orders, communicate with you about your purchases, send promotional emails (with your consent), improve our website and services, and comply with legal obligations.",
    },
    {
      title: "Information Sharing",
      content:
        "We do not sell your personal information. We may share your data with service providers who help us operate our business (payment processors, shipping carriers), and when required by law.",
    },
    {
      title: "Cookies and Tracking",
      content:
        "We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences.",
    },
    {
      title: "Data Security",
      content:
        "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
    },
    {
      title: "Your Rights",
      content:
        "You have the right to access, correct, or delete your personal information. You can also opt out of marketing communications at any time by clicking the unsubscribe link in our emails.",
    },
    {
      title: "Data Retention",
      content:
        "We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.",
    },
    {
      title: "Changes to This Policy",
      content:
        "We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the 'Last Updated' date.",
    },
  ],
  contactEmail: "privacy@poetryandpottery.com",
};

const DEFAULT_TERMS_CONTENT: TermsPageContent = {
  lastUpdated: "January 2025",
  introduction:
    "Welcome to Poetry & Pottery. By accessing or using our website, you agree to be bound by these Terms of Service. Please read them carefully before making a purchase or using our services.",
  sections: [
    {
      title: "Acceptance of Terms",
      content:
        "By accessing and using this website, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our website.",
    },
    {
      title: "Products and Pricing",
      content:
        "All products are handmade and may have slight variations in color, size, and pattern. These variations are not defects but rather the unique characteristics of handcrafted pottery. Prices are listed in Indian Rupees (INR) and are subject to change without notice.",
    },
    {
      title: "Orders and Payment",
      content:
        "By placing an order, you are making an offer to purchase. We reserve the right to refuse or cancel any order for any reason. Payment must be received in full before orders are processed. We accept major credit cards, debit cards, and UPI payments.",
    },
    {
      title: "Shipping and Delivery",
      content:
        "We make every effort to deliver your order within the estimated timeframe. However, delivery times are not guaranteed and may be affected by factors beyond our control. Risk of loss passes to you upon delivery to the carrier.",
    },
    {
      title: "Returns and Refunds",
      content:
        "Please refer to our Shipping & Returns page for detailed information about our return policy. Custom or personalized items cannot be returned unless they arrive damaged or defective.",
    },
    {
      title: "Intellectual Property",
      content:
        "All content on this website, including images, text, designs, and logos, is the property of Poetry & Pottery and is protected by copyright laws. You may not reproduce, distribute, or use our content without written permission.",
    },
    {
      title: "User Accounts",
      content:
        "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use of your account.",
    },
    {
      title: "Limitation of Liability",
      content:
        "Poetry & Pottery shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount you paid for the product in question.",
    },
    {
      title: "Governing Law",
      content:
        "These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.",
    },
    {
      title: "Contact Information",
      content:
        "If you have any questions about these Terms of Service, please contact us at legal@poetryandpottery.com or through our Contact page.",
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

    return config.defaultContent;

    // const page = await ctx.prisma.contentPage.findFirst({
    //   where: { slug, is_active: true },
    //   select: { content: true },
    // });

    // // Merge stored content with defaults - missing fields fallback to defaults
    // return mergeWithDefaults(
    //   page?.content as ContentPageContent | null,
    //   config.defaultContent,
    // );
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
