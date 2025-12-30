import { GraphQLError } from "graphql";
import { Ctx, Query, Resolver } from "type-graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { UserCounts, UserResponse } from "./user.type";

@Resolver()
export class UserResolver {
  @Query(() => UserResponse)
  @authRequired()
  async user(@Ctx() ctx: Context): Promise<UserResponse> {
    return tryCatchAsync(async () => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.user?.dbUserId,
        },
      });

      if (!user) {
        throw new GraphQLError("User not found");
      }

      return user;
    });
  }

  @Query(() => UserCounts)
  @authRequired()
  async userCounts(@Ctx() ctx: Context): Promise<UserCounts> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId;

      if (!userId) {
        throw new GraphQLError("User ID not found in context");
      }

      const user = await ctx.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          _count: {
            select: {
              carts: true,
              wishlists: true,
              event_registrations: true,
              product_orders: {
                where: {
                  status: "PENDING",
                },
              },
            },
          },
        },
      });

      return {
        cartCount: user?._count.carts ?? 0,
        wishlistCount: user?._count.wishlists ?? 0,
        eventRegistrationsCount: user?._count.event_registrations ?? 0,
        pendingOrdersCount: user?._count.product_orders ?? 0,
      };
    });
  }
}

export default UserResolver;
