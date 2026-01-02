import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import {
  EventRegistrationStatus,
  EventStatus,
  OrderStatus,
} from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  DashboardStats,
  LowStockProduct,
  NewsletterSubscriber,
  RecentOrder,
  RecentRegistration,
  UpcomingEvent,
} from "./analytics.type";

@Resolver()
export class AdminAnalyticsResolver {
  @Query(() => DashboardStats)
  @adminRequired()
  async adminDashboardStats(@Ctx() ctx: Context): Promise<DashboardStats> {
    return tryCatchAsync(async () => {
      const now = new Date();
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        pendingOrders,
        processingOrders,
        totalOrders,
        pendingRegistrations,
        totalRegistrations,
        outOfStockProducts,
        lowStockProducts,
        totalProducts,
        upcomingEvents,
        upcomingIn7DaysEvents,
        totalEvents,
        totalUsers,
        newUsersThisMonth,
        orderRevenue,
        registrationRevenue,
        totalNewsletterSubscribers,
        newNewsletterSubscribersThisMonth,
      ] = await Promise.all([
        // Orders
        ctx.prisma.productOrder.count({
          where: { status: OrderStatus.PENDING },
        }),
        ctx.prisma.productOrder.count({
          where: { status: OrderStatus.PROCESSING },
        }),
        ctx.prisma.productOrder.count(),

        // Registrations
        ctx.prisma.eventRegistration.count({
          where: { status: EventRegistrationStatus.PENDING },
        }),
        ctx.prisma.eventRegistration.count(),

        // Products
        ctx.prisma.product.count({
          where: { available_quantity: 0, is_active: true },
        }),
        ctx.prisma.product.count({
          where: {
            available_quantity: { gt: 0, lte: 5 },
            is_active: true,
          },
        }),
        ctx.prisma.product.count({ where: { is_active: true } }),

        // Events
        ctx.prisma.event.count({
          where: { status: EventStatus.UPCOMING },
        }),
        ctx.prisma.event.count({
          where: {
            status: EventStatus.UPCOMING,
            starts_at: { lte: sevenDaysFromNow },
          },
        }),
        ctx.prisma.event.count(),

        // Users
        ctx.prisma.user.count(),
        ctx.prisma.user.count({
          where: { created_at: { gte: startOfMonth } },
        }),

        // Revenue
        ctx.prisma.productOrder.aggregate({
          _sum: { total: true },
          where: {
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
              ],
            },
          },
        }),
        ctx.prisma.eventRegistration.aggregate({
          _sum: { price: true },
          where: {
            status: {
              in: [
                EventRegistrationStatus.PAID,
                EventRegistrationStatus.CONFIRMED,
              ],
            },
          },
        }),

        // Newsletter
        ctx.prisma.user.count({
          where: { subscribed_to_newsletter: true },
        }),
        ctx.prisma.user.count({
          where: {
            subscribed_to_newsletter: true,
            newsletter_subscribed_at: { gte: startOfMonth },
          },
        }),
      ]);

      return {
        orders: {
          pending: pendingOrders,
          processing: processingOrders,
          total: totalOrders,
        },
        registrations: {
          pending: pendingRegistrations,
          total: totalRegistrations,
        },
        products: {
          outOfStock: outOfStockProducts,
          lowStock: lowStockProducts,
          total: totalProducts,
        },
        events: {
          upcoming: upcomingEvents,
          upcomingIn7Days: upcomingIn7DaysEvents,
          total: totalEvents,
        },
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
        },
        revenue: {
          totalOrders: orderRevenue._sum.total ?? 0,
          totalRegistrations: registrationRevenue._sum.price ?? 0,
        },
        newsletter: {
          totalSubscribers: totalNewsletterSubscribers,
          newThisMonth: newNewsletterSubscribersThisMonth,
        },
      };
    });
  }

  @Query(() => [RecentOrder])
  @adminRequired()
  async adminRecentOrders(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 5 }) limit: number,
  ): Promise<RecentOrder[]> {
    return tryCatchAsync(async () => {
      const orders = await ctx.prisma.productOrder.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          status: true,
          total: true,
          created_at: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return orders;
    });
  }

  @Query(() => [RecentRegistration])
  @adminRequired()
  async adminRecentRegistrations(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 5 }) limit: number,
  ): Promise<RecentRegistration[]> {
    return tryCatchAsync(async () => {
      const registrations = await ctx.prisma.eventRegistration.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          status: true,
          price: true,
          seats_reserved: true,
          created_at: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              title: true,
            },
          },
        },
      });

      return registrations;
    });
  }

  @Query(() => [LowStockProduct])
  @adminRequired()
  async adminLowStockProducts(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<LowStockProduct[]> {
    return tryCatchAsync(async () => {
      const products = await ctx.prisma.product.findMany({
        where: {
          available_quantity: { lte: 5 },
          is_active: true,
        },
        take: limit,
        orderBy: { available_quantity: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          available_quantity: true,
          total_quantity: true,
          price: true,
        },
      });

      return products;
    });
  }

  @Query(() => [UpcomingEvent])
  @adminRequired()
  async adminUpcomingEvents(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 5 }) limit: number,
  ): Promise<UpcomingEvent[]> {
    return tryCatchAsync(async () => {
      const events = await ctx.prisma.event.findMany({
        where: {
          status: EventStatus.UPCOMING,
          starts_at: { gte: new Date() },
        },
        take: limit,
        orderBy: { starts_at: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          starts_at: true,
          available_seats: true,
          total_seats: true,
          _count: {
            select: {
              event_registrations: true,
            },
          },
        },
      });

      return events;
    });
  }

  @Query(() => [NewsletterSubscriber])
  @adminRequired()
  async adminNewsletterSubscribers(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<NewsletterSubscriber[]> {
    return tryCatchAsync(async () => {
      const subscribers = await ctx.prisma.user.findMany({
        where: { subscribed_to_newsletter: true },
        take: limit,
        orderBy: { newsletter_subscribed_at: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          newsletter_subscribed_at: true,
        },
      });

      return subscribers;
    });
  }
}
