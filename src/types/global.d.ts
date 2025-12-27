import type { UserRole } from "@/prisma/generated/enums";

declare global {
  interface CustomJwtSessionClaims {
    dbUserId?: number;
    environment?: "development" | "production" | "staging";
    role?: UserRole;
  }

  // Prisma JSON Types (used by prisma-json-types-generator)
  namespace PrismaJson {
    // SettingValue types for SiteSetting.value
    interface HeroImages {
      home: string;
      ourStory: string;
      products: string;
      events: string;
    }

    interface ContactInfo {
      address: string;
      email: string;
      phone: string;
      hours: string;
    }

    interface SocialLinks {
      instagram: string;
      facebook: string;
      twitter: string;
      pinterest: string;
    }

    // CategoryIconConfig for category_icons setting
    type CategoryIconConfig = Record<string, string>;

    type SettingValue =
      | HeroImages
      | ContactInfo
      | SocialLinks
      | CategoryIconConfig;

    // ContentBlocks types for ContentPage.content
    interface AboutValue {
      icon: string;
      title: string;
      description: string;
    }

    interface AboutTeamMember {
      name: string;
      role: string;
      image: string;
      bio: string;
    }

    interface AboutProcessStep {
      step: string;
      title: string;
      description: string;
    }

    interface AboutPageContent {
      storyTitle: string;
      storySubtitle: string;
      storyContent: string[];
      values: AboutValue[];
      team: AboutTeamMember[];
      processSteps: AboutProcessStep[];
    }

    interface FAQItem {
      question: string;
      answer: string;
    }

    interface FAQCategory {
      title: string;
      faqs: FAQItem[];
    }

    interface FAQPageContent {
      categories: FAQCategory[];
    }

    interface ShippingOption {
      icon: string;
      title: string;
      description: string;
      price: string;
    }

    interface ShippingInfo {
      title: string;
      content: string;
    }

    interface ReturnsPolicy {
      icon: string;
      title: string;
      description: string;
    }

    interface ReturnStep {
      step: string;
      title: string;
      description: string;
    }

    interface ShippingPageContent {
      shippingOptions: ShippingOption[];
      shippingInfo: ShippingInfo[];
      returnsPolicy: ReturnsPolicy[];
      returnSteps: ReturnStep[];
    }

    interface GlazeType {
      name: string;
      icon: string;
      description: string;
      care: string;
    }

    interface CareWarning {
      icon: string;
      title: string;
      description: string;
    }

    interface CarePageContent {
      glazeTypes: GlazeType[];
      warnings: CareWarning[];
      safeFor: string[];
      avoid: string[];
    }

    interface PrivacySection {
      title: string;
      content: string;
    }

    interface PrivacyPageContent {
      lastUpdated: string;
      introduction: string;
      sections: PrivacySection[];
      contactEmail: string;
    }

    interface TermsSection {
      title: string;
      content: string;
    }

    interface TermsPageContent {
      lastUpdated: string;
      introduction: string;
      sections: TermsSection[];
      contactEmail: string;
    }

    type ContentBlocks =
      | AboutPageContent
      | FAQPageContent
      | ShippingPageContent
      | CarePageContent
      | PrivacyPageContent
      | TermsPageContent;
  }
}

export {};
