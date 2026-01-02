import { GraphQLError } from "graphql";
import { Ctx, Mutation, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  NewsletterMutationResponse,
  NewsletterStatus,
} from "./newsletter.type";

function getUserId(ctx: Context): number {
  const userId = ctx.user?.dbUserId;
  if (!userId) {
    throw new GraphQLError("User ID not found in context");
  }
  return userId;
}

@Resolver()
export class NewsletterResolver {
  @Query(() => NewsletterStatus)
  @authRequired()
  async newsletterStatus(@Ctx() ctx: Context): Promise<NewsletterStatus> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscribed_to_newsletter: true,
          newsletter_subscribed_at: true,
        },
      });

      if (!user) {
        throw new GraphQLError("User not found");
      }

      return {
        subscribed: user.subscribed_to_newsletter,
        subscribed_at: user.newsletter_subscribed_at,
      };
    });
  }

  @Mutation(() => NewsletterMutationResponse)
  @authRequired()
  async subscribeToNewsletter(
    @Ctx() ctx: Context,
  ): Promise<NewsletterMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          subscribed_to_newsletter: true,
          newsletter_subscribed_at: new Date(),
        },
        select: {
          subscribed_to_newsletter: true,
          newsletter_subscribed_at: true,
        },
      });

      return {
        success: true,
        status: {
          subscribed: user.subscribed_to_newsletter,
          subscribed_at: user.newsletter_subscribed_at,
        },
      };
    });
  }

  @Mutation(() => NewsletterMutationResponse)
  @authRequired()
  async unsubscribeFromNewsletter(
    @Ctx() ctx: Context,
  ): Promise<NewsletterMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          subscribed_to_newsletter: false,
          newsletter_subscribed_at: null,
        },
        select: {
          subscribed_to_newsletter: true,
          newsletter_subscribed_at: true,
        },
      });

      return {
        success: true,
        status: {
          subscribed: user.subscribed_to_newsletter,
          subscribed_at: user.newsletter_subscribed_at,
        },
      };
    });
  }
}
