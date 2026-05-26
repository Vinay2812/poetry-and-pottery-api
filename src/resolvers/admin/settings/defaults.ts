// poetry-and-pottery-api/src/resolvers/admin/settings/defaults.ts

// Real, sensible defaults for every editable content slot on the public site.
// Single source of truth: consumed by resolvers (fallback + seed),
// by the public siteContentDefaults query, and mirrored into the frontend
// at codegen time via scripts/sync-defaults.ts.

export const SETTING_KEYS = {
  HERO_IMAGES: "hero_images",
  HERO_VIDEOS: "hero_videos",
  BRAND_ASSETS: "brand_assets",
  SEO_METADATA: "seo_metadata",
  FOOTER_CONTENT: "footer_content",
  PAGE_TAGLINES: "page_taglines",
  CONTACT_INFO: "contact_info",
  SOCIAL_LINKS: "social_links",
} as const;

export type PageSlug =
  | "home"
  | "store"
  | "events"
  | "about"
  | "contact"
  | "faq"
  | "shipping"
  | "care"
  | "privacy"
  | "terms"
  | "customize"
  | "ourStory";

export const PAGE_SLUGS: PageSlug[] = [
  "home",
  "store",
  "events",
  "about",
  "contact",
  "faq",
  "shipping",
  "care",
  "privacy",
  "terms",
  "customize",
  "ourStory",
];

export interface HeroImagesDefaults {
  home: string;
  store: string;
  events: string;
  about: string;
  contact: string;
  faq: string;
  shipping: string;
  care: string;
  privacy: string;
  terms: string;
  customize: string;
  ourStory: string;
}

export interface HeroVideoEntry {
  src: string;
  poster: string;
}
export interface HeroVideosDefaults {
  home: HeroVideoEntry;
}

export interface BrandAssetsDefaults {
  logo: string;
  logoDark: string;
  favicon: string;
  appleTouchIcon: string;
  defaultOgImage: string;
}

export interface SeoEntry {
  title: string;
  description: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
}
export type SeoMetadataDefaults = Record<PageSlug, SeoEntry>;

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}
export interface FooterContentDefaults {
  tagline: string;
  copyright: string;
  columns: FooterColumn[];
  newsletterBlurb: string;
}

export interface TaglineEntry {
  heading: string;
  subheading: string;
  ctaText: string;
}
export type PageTaglinesDefaults = Record<PageSlug, TaglineEntry>;

const HOME_HERO =
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1920&q=80";
const STORE_HERO =
  "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=1920&q=80";
const EVENT_HERO =
  "https://images.unsplash.com/photo-1614178060596-4a9c8a8c5b9c?w=1920&q=80";
const ABOUT_HERO =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&q=80";
const CONTACT_HERO =
  "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1920&q=80";
const GENERIC_HERO =
  "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=1920&q=80";

export const DEFAULT_HERO_IMAGES: HeroImagesDefaults = {
  home: HOME_HERO,
  store: STORE_HERO,
  events: EVENT_HERO,
  about: ABOUT_HERO,
  contact: CONTACT_HERO,
  faq: GENERIC_HERO,
  shipping: GENERIC_HERO,
  care: GENERIC_HERO,
  privacy: GENERIC_HERO,
  terms: GENERIC_HERO,
  customize: GENERIC_HERO,
  ourStory: ABOUT_HERO,
};

export const DEFAULT_HERO_VIDEOS: HeroVideosDefaults = {
  home: {
    src: "https://cdn.poetryandpottery.prodapp.club/videos/poetry-pottery-video.mp4",
    poster: HOME_HERO,
  },
};

export const DEFAULT_BRAND_ASSETS: BrandAssetsDefaults = {
  logo: "/logo.svg",
  logoDark: "/logo-dark.svg",
  favicon: "/favicon.ico",
  appleTouchIcon: "/apple-touch-icon.png",
  defaultOgImage: HOME_HERO,
};

const seoFor = (
  title: string,
  description: string,
  ogImage = HOME_HERO,
): SeoEntry => ({
  title,
  description,
  ogImage,
  ogTitle: title,
  ogDescription: description,
});

export const DEFAULT_SEO_METADATA: SeoMetadataDefaults = {
  home: seoFor(
    "Poetry & Pottery — Handcrafted Ceramics",
    "Handmade pottery and ceramic art. Mugs, bowls, plates, vases — each piece one of a kind.",
    HOME_HERO,
  ),
  store: seoFor(
    "Store — Poetry & Pottery",
    "Browse our full collection of handcrafted ceramics.",
    STORE_HERO,
  ),
  events: seoFor(
    "Workshops & Events — Poetry & Pottery",
    "Hands-on pottery workshops with master potters.",
    EVENT_HERO,
  ),
  about: seoFor(
    "About Us — Poetry & Pottery",
    "The story behind our studio and the craft we love.",
    ABOUT_HERO,
  ),
  contact: seoFor(
    "Contact — Poetry & Pottery",
    "Reach out — we'd love to hear from you.",
    CONTACT_HERO,
  ),
  faq: seoFor(
    "FAQ — Poetry & Pottery",
    "Answers to common questions about our pottery, workshops, and orders.",
    GENERIC_HERO,
  ),
  shipping: seoFor(
    "Shipping & Returns — Poetry & Pottery",
    "Shipping options, timing, and our returns policy.",
    GENERIC_HERO,
  ),
  care: seoFor(
    "Care Guide — Poetry & Pottery",
    "How to care for your handcrafted ceramics.",
    GENERIC_HERO,
  ),
  privacy: seoFor(
    "Privacy Policy — Poetry & Pottery",
    "How we collect and use your data.",
    GENERIC_HERO,
  ),
  terms: seoFor(
    "Terms of Service — Poetry & Pottery",
    "Terms and conditions for using our store.",
    GENERIC_HERO,
  ),
  customize: seoFor(
    "Custom Orders — Poetry & Pottery",
    "Commission a one-of-a-kind piece.",
    GENERIC_HERO,
  ),
  ourStory: seoFor(
    "Our Story — Poetry & Pottery",
    "How Poetry & Pottery came to be.",
    ABOUT_HERO,
  ),
};

export const DEFAULT_FOOTER_CONTENT: FooterContentDefaults = {
  tagline: "Handcrafted ceramics, made with intention.",
  copyright: "© Poetry & Pottery. All rights reserved.",
  newsletterBlurb: "Sign up for new drops, workshop dates, and studio notes.",
  columns: [
    {
      title: "Shop",
      links: [
        { label: "All Products", href: "/products" },
        { label: "New Arrivals", href: "/products?sort=new" },
        { label: "Best Sellers", href: "/products?sort=bestsellers" },
      ],
    },
    {
      title: "Studio",
      links: [
        { label: "About", href: "/about" },
        { label: "Workshops", href: "/events" },
        { label: "Custom Orders", href: "/customize" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "Contact", href: "/contact" },
        { label: "Shipping", href: "/shipping" },
        { label: "Care Guide", href: "/care" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  ],
};

const taglineFor = (
  heading: string,
  subheading: string,
  ctaText = "Explore",
): TaglineEntry => ({ heading, subheading, ctaText });

export const DEFAULT_PAGE_TAGLINES: PageTaglinesDefaults = {
  home: taglineFor(
    "Poetry in every piece",
    "Handcrafted ceramics from our studio to your home.",
    "Shop now",
  ),
  store: taglineFor(
    "The collection",
    "Mugs, bowls, plates, vases — each one made by hand.",
    "Browse",
  ),
  events: taglineFor(
    "Workshops",
    "Hands-on classes with master potters.",
    "Reserve a seat",
  ),
  about: taglineFor(
    "Our story",
    "The craft, the studio, the people.",
    "Read more",
  ),
  contact: taglineFor(
    "Get in touch",
    "We'd love to hear from you.",
    "Send a message",
  ),
  faq: taglineFor(
    "Questions, answered",
    "Everything you might want to know.",
    "Read FAQ",
  ),
  shipping: taglineFor(
    "Shipping & returns",
    "What to expect and how returns work.",
    "Learn more",
  ),
  care: taglineFor(
    "Care guide",
    "How to keep your ceramics beautiful for years.",
    "Read guide",
  ),
  privacy: taglineFor(
    "Privacy",
    "How we handle your information.",
    "Read policy",
  ),
  terms: taglineFor("Terms", "The rules of using our store.", "Read terms"),
  customize: taglineFor(
    "Custom orders",
    "Commission a one-of-a-kind piece.",
    "Start a request",
  ),
  ourStory: taglineFor(
    "Our story",
    "Where Poetry & Pottery began.",
    "Continue",
  ),
};

export const SITE_CONTENT_DEFAULTS = {
  [SETTING_KEYS.HERO_IMAGES]: DEFAULT_HERO_IMAGES,
  [SETTING_KEYS.HERO_VIDEOS]: DEFAULT_HERO_VIDEOS,
  [SETTING_KEYS.BRAND_ASSETS]: DEFAULT_BRAND_ASSETS,
  [SETTING_KEYS.SEO_METADATA]: DEFAULT_SEO_METADATA,
  [SETTING_KEYS.FOOTER_CONTENT]: DEFAULT_FOOTER_CONTENT,
  [SETTING_KEYS.PAGE_TAGLINES]: DEFAULT_PAGE_TAGLINES,
} as const;
