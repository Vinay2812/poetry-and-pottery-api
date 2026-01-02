import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import {
  EventRegistrationStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminUserCartItem,
  AdminUserDetail,
  AdminUserMutationResponse,
  AdminUserOrder,
  AdminUserRegistration,
  AdminUserWishlistResponse,
  AdminUsersFilterInput,
  AdminUsersResponse,
} from "./users.type";

@Resolver()
export class AdminUsersResolver {
  @Query(() => AdminUsersResponse)
  @adminRequired()
  async adminUsers(
    @Ctx() ctx: Context,
    @Arg("filter", () => AdminUsersFilterInput, { nullable: true })
    filter?: AdminUsersFilterInput,
  ): Promise<AdminUsersResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { email: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    if (filter?.role) {
      where.role = filter.role;
    }

    // Parse sort parameter
    let orderBy: Prisma.UserOrderByWithRelationInput = { created_at: "desc" };
    if (filter?.sort) {
      const [field, direction] = filter.sort.split("_");
      if (field && direction) {
        orderBy = { [field]: direction } as Prisma.UserOrderByWithRelationInput;
      }
    }

    const [users, total] = await Promise.all([
      ctx.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          auth_id: true,
          email: true,
          name: true,
          image: true,
          phone: true,
          role: true,
          created_at: true,
          _count: {
            select: {
              product_orders: true,
              event_registrations: true,
            },
          },
          product_orders: {
            where: {
              status: {
                in: [
                  OrderStatus.PENDING,
                  OrderStatus.PROCESSING,
                  OrderStatus.PAID,
                  OrderStatus.SHIPPED,
                ],
              },
            },
            select: { id: true },
          },
          event_registrations: {
            where: {
              status: {
                in: [
                  EventRegistrationStatus.PENDING,
                  EventRegistrationStatus.APPROVED,
                ],
              },
            },
            select: { id: true },
          },
        },
      }),
      ctx.prisma.user.count({ where }),
    ]);

    const usersWithPendingCounts = users.map((user) => ({
      id: user.id,
      auth_id: user.auth_id,
      email: user.email,
      name: user.name,
      image: user.image,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      _count: user._count,
      pendingOrdersCount: user.product_orders.length,
      pendingRegistrationsCount: user.event_registrations.length,
    }));

    return {
      users: usersWithPendingCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Query(() => AdminUserDetail, { nullable: true })
  @adminRequired()
  async adminUserById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminUserDetail | null> {
    const user = await ctx.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        auth_id: true,
        email: true,
        name: true,
        image: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            product_orders: true,
            event_registrations: true,
            wishlists: true,
            carts: true,
            reviews: true,
          },
        },
      },
    });

    return user;
  }

  @Query(() => [AdminUserOrder])
  @adminRequired()
  async adminUserOrders(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
  ): Promise<AdminUserOrder[]> {
    const orders = await ctx.prisma.productOrder.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        total: true,
        subtotal: true,
        discount: true,
        shipping_fee: true,
        created_at: true,
        request_at: true,
        approved_at: true,
        paid_at: true,
        shipped_at: true,
        delivered_at: true,
        cancelled_at: true,
        returned_at: true,
        refunded_at: true,
        ordered_products: {
          select: {
            id: true,
            quantity: true,
            price: true,
            discount: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                image_urls: true,
              },
            },
          },
        },
      },
    });

    return orders;
  }

  @Query(() => [AdminUserRegistration])
  @adminRequired()
  async adminUserRegistrations(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
  ): Promise<AdminUserRegistration[]> {
    const registrations = await ctx.prisma.eventRegistration.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        seats_reserved: true,
        price: true,
        discount: true,
        created_at: true,
        request_at: true,
        approved_at: true,
        paid_at: true,
        confirmed_at: true,
        cancelled_at: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            starts_at: true,
            ends_at: true,
            location: true,
            image: true,
            price: true,
          },
        },
      },
    });

    return registrations;
  }

  @Query(() => [AdminUserCartItem])
  @adminRequired()
  async adminUserCart(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
  ): Promise<AdminUserCartItem[]> {
    const cartItems = await ctx.prisma.cart.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        quantity: true,
        created_at: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            available_quantity: true,
            image_urls: true,
          },
        },
      },
    });

    return cartItems;
  }

  @Query(() => AdminUserWishlistResponse)
  @adminRequired()
  async adminUserWishlist(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
    @Arg("page", () => Int, { nullable: true, defaultValue: 1 }) page: number,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<AdminUserWishlistResponse> {
    const skip = (page - 1) * limit;

    const [wishlistItems, total] = await Promise.all([
      ctx.prisma.wishlist.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              available_quantity: true,
              image_urls: true,
            },
          },
        },
      }),
      ctx.prisma.wishlist.count({ where: { user_id: userId } }),
    ]);

    return {
      data: wishlistItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Mutation(() => AdminUserMutationResponse)
  @adminRequired()
  async adminUpdateUserRole(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
    @Arg("role", () => String) roleStr: string,
  ): Promise<AdminUserMutationResponse> {
    return tryCatchAsync(async () => {
      const role = roleStr as UserRole;

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      await ctx.prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return { success: true, error: null };
    });
  }
}
