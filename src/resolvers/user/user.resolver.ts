import { GraphQLError } from "graphql";
import { Ctx, Query, Resolver } from "type-graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { UserResponse } from "./user.type";

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
}

export default UserResolver;
