import { Request, Response } from "express";
import { GraphQLError } from "graphql";
import { createMethodMiddlewareDecorator } from "type-graphql";

import { ENV, LOCAL_ADMIN_BYPASS_SECRET } from "@/consts/env";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { clerkClient, getAuth } from "@clerk/express";

const PRODUCT_NON_AUTH_RESOLVERS: string[] = [
  "Products",
  "SitemapProducts",
  "ProductBySlug",
  "ProductById",
  "RelatedProducts",
  "FeaturedProducts",
  "BestSellers",
  "RecommendedProducts",
  "Categories",
  "Materials",
  "CategoriesWithImages",
  "FeaturedReviews",
  "Collections",
];

const EVENT_NON_AUTH_RESOLVERS: string[] = [
  "Events",
  "SitemapEvents",
  "EventBySlug",
  "EventById",
  "UpcomingEvents",
  "PastEvents",
  "EventWithUserContext",
];

const DAILY_WORKSHOP_NON_AUTH_RESOLVERS: string[] = [
  "DailyWorkshopPublicConfig",
  "DailyWorkshopAvailability",
];

const REVIEW_NON_AUTH_RESOLVERS: string[] = ["ProductReviews", "EventReviews"];

const SEARCH_NON_AUTH_RESOLVERS: string[] = ["GlobalSearch"];

const CUSTOMIZATION_NON_AUTH_RESOLVERS: string[] = [
  "CustomizationCategories",
  "CustomizationOptionsByCategory",
  "CustomizationTypes",
];

const PUBLIC_CONTENT_NON_AUTH_RESOLVERS: string[] = [
  "PublicAboutContent",
  "PublicFAQContent",
  "PublicShippingContent",
  "PublicCareContent",
  "PublicPrivacyContent",
  "PublicTermsContent",
  "PublicHeroImages",
  "PublicContactInfo",
  "PublicSocialLinks",
];

const NON_AUTH_RESOLVERS: string[] = [
  ...PRODUCT_NON_AUTH_RESOLVERS,
  ...EVENT_NON_AUTH_RESOLVERS,
  ...DAILY_WORKSHOP_NON_AUTH_RESOLVERS,
  ...REVIEW_NON_AUTH_RESOLVERS,
  ...SEARCH_NON_AUTH_RESOLVERS,
  ...CUSTOMIZATION_NON_AUTH_RESOLVERS,
  ...PUBLIC_CONTENT_NON_AUTH_RESOLVERS,
  "IntrospectionQuery",
];

export const authMiddleWare = async (
  req: Request,
  res: Response,
): Promise<Context> => {
  const operationName = req.body?.operationName || req.headers["operationname"];

  const context: Context = {
    request: req,
    response: res,
    prisma,
  };

  const requiredAuth = !NON_AUTH_RESOLVERS.includes(operationName);

  const { isAuthenticated, sessionClaims, userId } = getAuth(req);
  const { dbUserId, role } = sessionClaims || {};

  if (isAuthenticated) {
    if (!dbUserId) {
      const clerkUser = await clerkClient.users.getUser(userId);
      if (!clerkUser) {
        throw new GraphQLError("Clerk user not found");
      }

      const emailAddress = clerkUser.emailAddresses[0].emailAddress;
      const name =
        clerkUser.fullName ||
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();
      const image = clerkUser.imageUrl;
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber;

      if (!emailAddress) {
        throw new GraphQLError("Email address is not available in Clerk user");
      }

      const user = await prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: {
            email: emailAddress,
          },
          update: {
            auth_id: userId,
            name,
            image,
          },
          create: {
            auth_id: userId,
            email: emailAddress,
            name,
            image,
            phone,
          },
        });

        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            dbUserId: user.id,
            role: user.role,
          },
        });

        return user;
      });

      context.user = {
        dbUserId: user.id,
        role: user.role,
      };
    } else {
      context.user = {
        dbUserId,
        role: role ?? UserRole.USER,
      };
    }
  } else if (isLocalAdminBypassAllowed(req)) {
    context.user = {
      dbUserId: 1,
      role: UserRole.ADMIN,
      environment: "local",
    };
  } else if (requiredAuth) {
    throw new GraphQLError("User is not authenticated");
  }

  return context;
};

const LOCAL_ADMIN_BYPASS_HEADER = "x-local-admin-secret";

function isLocalAdminBypassAllowed(req: Request): boolean {
  // if (ENV === "production") {
  //   return false;
  // }

  // if (!LOCAL_ADMIN_BYPASS_SECRET) {
  //   return false;
  // }

  // const headerValue = req.headers[LOCAL_ADMIN_BYPASS_HEADER];
  // const secret = Array.isArray(headerValue)
  //   ? headerValue[0]
  //   : headerValue?.toString();

  // if (!secret || secret !== LOCAL_ADMIN_BYPASS_SECRET) {
  //   return false;
  // }

  // return isLocalRequest(req);
  return false;
}

function isLocalRequest(req: Request): boolean {
  const host = req.headers.host?.split(":")[0];
  const hostname = req.hostname;
  const ip = req.ip;
  const remoteAddress = req.socket?.remoteAddress;

  return [host, hostname, ip, remoteAddress].some(isLocalHostValue);
}

function isLocalHostValue(value?: string): boolean {
  if (!value) {
    return false;
  }

  return (
    value === "localhost" ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value === "::ffff:127.0.0.1"
  );
}

export function authRequired(
  errorMessage: string = "User is not authenticated",
) {
  return createMethodMiddlewareDecorator<Context>(async ({ context }, next) => {
    if (!context.user) {
      throw new GraphQLError(errorMessage);
    }

    return next();
  });
}

export function adminRequired(errorMessage: string = "Admin access required") {
  return createMethodMiddlewareDecorator<Context>(async ({ context }, next) => {
    if (!context.user) {
      throw new GraphQLError("User is not authenticated");
    }

    if (context.user.role !== UserRole.ADMIN) {
      throw new GraphQLError(errorMessage);
    }

    return next();
  });
}
