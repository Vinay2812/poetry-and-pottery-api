import { Arg, Ctx, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { EventStatus as PrismaEventStatus } from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  EventLevel,
  EventRegistrationStatus,
  EventStatus,
} from "../events/events.type";
import { OrderStatus } from "../orders/orders.type";
import { GlobalSearchInput, GlobalSearchResponse } from "./search.type";

function mapPrismaEventStatus(status: PrismaEventStatus): EventStatus {
  const statusMap: Record<PrismaEventStatus, EventStatus> = {
    [PrismaEventStatus.UPCOMING]: EventStatus.UPCOMING,
    [PrismaEventStatus.ACTIVE]: EventStatus.ACTIVE,
    [PrismaEventStatus.INACTIVE]: EventStatus.INACTIVE,
    [PrismaEventStatus.CANCELLED]: EventStatus.CANCELLED,
    [PrismaEventStatus.COMPLETED]: EventStatus.COMPLETED,
  };
  return statusMap[status];
}

function mapPrismaEventLevel(level: string): EventLevel {
  const levelMap: Record<string, EventLevel> = {
    BEGINNER: EventLevel.BEGINNER,
    INTERMEDIATE: EventLevel.INTERMEDIATE,
    ADVANCED: EventLevel.ADVANCED,
  };
  return levelMap[level] ?? EventLevel.BEGINNER;
}

function mapPrismaOrderStatus(status: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    PENDING: OrderStatus.PENDING,
    PROCESSING: OrderStatus.PROCESSING,
    PAID: OrderStatus.PAID,
    SHIPPED: OrderStatus.SHIPPED,
    DELIVERED: OrderStatus.DELIVERED,
    CANCELLED: OrderStatus.CANCELLED,
    RETURNED: OrderStatus.RETURNED,
    REFUNDED: OrderStatus.REFUNDED,
  };
  return statusMap[status] ?? OrderStatus.PENDING;
}

@Resolver()
export class SearchResolver {
  @Query(() => GlobalSearchResponse)
  async globalSearch(
    @Ctx() ctx: Context,
    @Arg("input", () => GlobalSearchInput) input: GlobalSearchInput,
  ): Promise<GlobalSearchResponse> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId;
      const query = input.query?.trim() ?? "";
      const limit = input.limit ?? 5;

      // Return empty results if query is empty
      if (!query) {
        return {
          products: [],
          events: [],
          orders: [],
          counts: { products: 0, events: 0, orders: 0 },
        };
      }

      // Search products
      const productsPromise = prisma.product
        .findMany({
          where: {
            is_active: true,
            OR: [{ name: { contains: query, mode: "insensitive" } }],
          },
          include: {
            reviews: { select: { rating: true } },
          },
          take: limit,
          orderBy: [{ available_quantity: "desc" }, { created_at: "desc" }],
        })
        .then((products) =>
          products.map((product) => {
            const reviewsCount = product.reviews.length;
            const avgRating =
              reviewsCount > 0
                ? Math.round(
                    product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                      reviewsCount,
                  )
                : 0;

            return {
              id: product.id,
              slug: product.slug,
              name: product.name,
              image_urls: product.image_urls,
              price: product.price,
              material: product.material,
              total_quantity: product.total_quantity,
              available_quantity: product.available_quantity,
              color_code: product.color_code,
              color_name: product.color_name,
              reviews_count: reviewsCount,
              avg_rating: avgRating,
              in_wishlist: false,
            };
          }),
        );

      const productsCountPromise = prisma.product.count({
        where: {
          is_active: true,
          OR: [{ name: { contains: query, mode: "insensitive" } }],
        },
      });

      // Search events (upcoming and active only)
      const eventsPromise = prisma.event
        .findMany({
          where: {
            status: {
              in: [PrismaEventStatus.UPCOMING, PrismaEventStatus.ACTIVE],
            },
            OR: [{ title: { contains: query, mode: "insensitive" } }],
          },
          include: {
            _count: { select: { event_registrations: true, reviews: true } },
            reviews: { select: { rating: true } },
          },
          take: limit,
          orderBy: { starts_at: "asc" },
        })
        .then((events) =>
          events.map((event) => {
            const reviewsCount = event.reviews.length;
            const avgRating =
              reviewsCount > 0
                ? event.reviews.reduce((sum, r) => sum + r.rating, 0) /
                  reviewsCount
                : null;

            return {
              id: event.id,
              slug: event.slug,
              title: event.title,
              description: event.description,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              location: event.location,
              full_location: event.full_location,
              total_seats: event.total_seats,
              available_seats: event.available_seats,
              instructor: event.instructor,
              includes: event.includes,
              price: event.price,
              image: event.image,
              highlights: event.highlights,
              gallery: event.gallery,
              status: mapPrismaEventStatus(event.status),
              level: mapPrismaEventLevel(event.level),
              created_at: event.created_at,
              updated_at: event.updated_at,
              registrations_count: event._count.event_registrations,
              reviews_count: event._count.reviews,
              avg_rating: avgRating,
            };
          }),
        );

      const eventsCountPromise = prisma.event.count({
        where: {
          status: {
            in: [PrismaEventStatus.UPCOMING, PrismaEventStatus.ACTIVE],
          },
          OR: [{ title: { contains: query, mode: "insensitive" } }],
        },
      });

      // Search orders (only if user is authenticated)
      let ordersPromise: Promise<GlobalSearchResponse["orders"]> =
        Promise.resolve([]);
      let ordersCountPromise: Promise<number> = Promise.resolve(0);

      if (userId) {
        ordersPromise = prisma.productOrder
          .findMany({
            where: {
              user_id: userId,
              ordered_products: {
                some: {
                  product: {
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
            },
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
              ordered_products: {
                include: {
                  product: {
                    include: {
                      reviews: { select: { rating: true } },
                    },
                  },
                },
              },
            },
            take: limit,
            orderBy: { created_at: "desc" },
          })
          .then((orders) =>
            orders.map((order) => ({
              id: order.id,
              user_id: order.user_id,
              user: {
                id: order.user.id,
                email: order.user.email,
                name: order.user.name,
              },
              shipping_fee: order.shipping_fee,
              subtotal: order.subtotal,
              discount: order.discount,
              total: order.total,
              status: mapPrismaOrderStatus(order.status),
              request_at: order.request_at,
              approved_at: order.approved_at,
              paid_at: order.paid_at,
              shipped_at: order.shipped_at,
              delivered_at: order.delivered_at,
              cancelled_at: order.cancelled_at,
              returned_at: order.returned_at,
              refunded_at: order.refunded_at,
              shipping_address:
                order.shipping_address as GlobalSearchResponse["orders"][0]["shipping_address"],
              created_at: order.created_at,
              updated_at: order.updated_at,
              ordered_products: order.ordered_products.map((item) => {
                const reviewsCount = item.product.reviews.length;
                const avgRating =
                  reviewsCount > 0
                    ? Math.round(
                        item.product.reviews.reduce(
                          (sum, r) => sum + r.rating,
                          0,
                        ) / reviewsCount,
                      )
                    : 0;

                return {
                  id: item.id,
                  order_id: item.order_id,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  discount: item.discount,
                  price: item.price,
                  created_at: item.created_at,
                  updated_at: item.updated_at,
                  has_reviewed: false,
                  product: {
                    id: item.product.id,
                    slug: item.product.slug,
                    name: item.product.name,
                    image_urls: item.product.image_urls,
                    price: item.product.price,
                    material: item.product.material,
                    total_quantity: item.product.total_quantity,
                    available_quantity: item.product.available_quantity,
                    color_code: item.product.color_code,
                    color_name: item.product.color_name,
                    reviews_count: reviewsCount,
                    avg_rating: avgRating,
                    in_wishlist: false,
                  },
                };
              }),
            })),
          );

        ordersCountPromise = prisma.productOrder.count({
          where: {
            user_id: userId,
            ordered_products: {
              some: {
                product: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          },
        });
      }

      const [
        products,
        productsCount,
        events,
        eventsCount,
        orders,
        ordersCount,
      ] = await Promise.all([
        productsPromise,
        productsCountPromise,
        eventsPromise,
        eventsCountPromise,
        ordersPromise,
        ordersCountPromise,
      ]);

      return {
        products,
        events,
        orders,
        counts: {
          products: productsCount,
          events: eventsCount,
          orders: ordersCount,
        },
      };
    });
  }
}
