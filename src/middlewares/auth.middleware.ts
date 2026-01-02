import { Request, Response } from "express";
import { GraphQLError } from "graphql";
import { createMethodMiddlewareDecorator } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { clerkClient, getAuth } from "@clerk/express";

const PRODUCT_NON_AUTH_RESOLVERS: string[] = [
  "Products",
  "ProductBySlug",
  "ProductById",
  "RelatedProducts",
  "FeaturedProducts",
  "BestSellers",
  "RecommendedProducts",
];

const EVENT_NON_AUTH_RESOLVERS: string[] = [
  "Events",
  "EventBySlug",
  "EventById",
  "UpcomingEvents",
  "PastEvents",
  "EventWithUserContext",
];

const REVIEW_NON_AUTH_RESOLVERS: string[] = ["ProductReviews", "EventReviews"];

const SEARCH_NON_AUTH_RESOLVERS: string[] = ["GlobalSearch"];

const NON_AUTH_RESOLVERS: string[] = [
  ...PRODUCT_NON_AUTH_RESOLVERS,
  ...EVENT_NON_AUTH_RESOLVERS,
  ...REVIEW_NON_AUTH_RESOLVERS,
  ...SEARCH_NON_AUTH_RESOLVERS,
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

  if (requiredAuth) {
    const { isAuthenticated, sessionClaims, userId } = getAuth(req);

    if (!isAuthenticated) {
      throw new GraphQLError("User is not authenticated");
    }

    const { dbUserId, role } = sessionClaims;

    // If not exists, create a new user
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
          privateMetadata: {
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
  }

  return context;
};

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
