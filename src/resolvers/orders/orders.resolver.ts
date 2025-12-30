import { GraphQLError } from "graphql";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import { OrderStatus as PrismaOrderStatus } from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderMutationResponse,
  OrderStatus,
  OrdersFilterInput,
  OrdersResponse,
  OrderUser,
  ShippingAddress,
} from "./orders.type";

function getUserId(ctx: Context): number {
  const userId = ctx.user?.dbUserId;
  if (!userId) {
    throw new GraphQLError("User ID not found in context");
  }
  return userId;
}

function mapToProductBase(product: {
  id: number;
  slug: string;
  name: string;
  image_urls: string[];
  price: number;
  material: string;
  total_quantity: number;
  available_quantity: number;
  color_code: string;
  color_name: string;
  reviews?: { rating: number }[];
}) {
  const reviews = product.reviews ?? [];
  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount)
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
}

function mapOrderItem(
  item: {
    id: number;
    order_id: string;
    product_id: number;
    quantity: number;
    discount: number;
    price: number;
    created_at: Date;
    updated_at: Date;
    product: {
      id: number;
      slug: string;
      name: string;
      image_urls: string[];
      price: number;
      material: string;
      total_quantity: number;
      available_quantity: number;
      color_code: string;
      color_name: string;
      reviews?: { rating: number }[];
    };
  },
  reviewedProductIds: Set<number>,
  wishlistProductIds: Set<number>,
): OrderItem {
  const productBase = mapToProductBase(item.product);
  productBase.in_wishlist = wishlistProductIds.has(item.product_id);

  return {
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    quantity: item.quantity,
    discount: item.discount,
    price: item.price,
    created_at: item.created_at,
    updated_at: item.updated_at,
    product: productBase,
    has_reviewed: reviewedProductIds.has(item.product_id),
  };
}

function mapOrder(
  order: {
    id: string;
    user_id: number;
    shipping_fee: number;
    subtotal: number;
    discount: number;
    total: number;
    status: PrismaOrderStatus;
    request_at: Date | null;
    approved_at: Date | null;
    paid_at: Date | null;
    shipped_at: Date | null;
    delivered_at: Date | null;
    cancelled_at: Date | null;
    returned_at: Date | null;
    refunded_at: Date | null;
    shipping_address: unknown;
    created_at: Date;
    updated_at: Date;
    user: {
      id: number;
      email: string;
      name: string | null;
    };
    ordered_products: {
      id: number;
      order_id: string;
      product_id: number;
      quantity: number;
      discount: number;
      price: number;
      created_at: Date;
      updated_at: Date;
      product: {
        id: number;
        slug: string;
        name: string;
        image_urls: string[];
        price: number;
        material: string;
        total_quantity: number;
        available_quantity: number;
        color_code: string;
        color_name: string;
        reviews?: { rating: number }[];
      };
    }[];
  },
  reviewedProductIds: Set<number>,
  wishlistProductIds: Set<number>,
): Order {
  return {
    id: order.id,
    user_id: order.user_id,
    user: {
      id: order.user.id,
      email: order.user.email,
      name: order.user.name,
    } as OrderUser,
    shipping_fee: order.shipping_fee,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    status: order.status as OrderStatus,
    request_at: order.request_at,
    approved_at: order.approved_at,
    paid_at: order.paid_at,
    shipped_at: order.shipped_at,
    delivered_at: order.delivered_at,
    cancelled_at: order.cancelled_at,
    returned_at: order.returned_at,
    refunded_at: order.refunded_at,
    shipping_address: order.shipping_address as ShippingAddress,
    created_at: order.created_at,
    updated_at: order.updated_at,
    ordered_products: order.ordered_products.map((item) =>
      mapOrderItem(item, reviewedProductIds, wishlistProductIds),
    ),
  };
}

@Resolver()
export class OrdersResolver {
  @Query(() => OrdersResponse)
  @authRequired()
  async orders(
    @Ctx() ctx: Context,
    @Arg("filter", () => OrdersFilterInput, { nullable: true })
    filter?: OrdersFilterInput,
  ): Promise<OrdersResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 10;
      const search = filter?.search;

      const where: {
        user_id: number;
        ordered_products?: {
          some: {
            product: { name: { contains: string; mode: "insensitive" } };
          };
        };
      } = { user_id: userId };

      if (search) {
        where.ordered_products = {
          some: {
            product: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        };
      }

      const [orders, total, wishlistItems] = await Promise.all([
        ctx.prisma.productOrder.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            ordered_products: {
              include: {
                product: {
                  include: { reviews: { select: { rating: true } } },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.productOrder.count({ where }),
        ctx.prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        }),
      ]);

      // Get all product IDs from all orders
      const productIds = orders.flatMap((order) =>
        order.ordered_products.map((item) => item.product_id),
      );

      // Check which products the user has reviewed
      const userReviews = await ctx.prisma.review.findMany({
        where: {
          user_id: userId,
          product_id: { in: productIds },
        },
        select: { product_id: true },
      });

      const reviewedProductIds = new Set<number>();
      for (const review of userReviews) {
        if (review.product_id) {
          reviewedProductIds.add(review.product_id);
        }
      }

      const wishlistProductIds = new Set(
        wishlistItems.map((w) => w.product_id),
      );

      return {
        data: orders.map((order) =>
          mapOrder(order, reviewedProductIds, wishlistProductIds),
        ),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => Order, { nullable: true })
  @authRequired()
  async order(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
  ): Promise<Order | null> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const [order, wishlistItems] = await Promise.all([
        ctx.prisma.productOrder.findFirst({
          where: {
            id,
            user_id: userId,
          },
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            ordered_products: {
              include: {
                product: {
                  include: { reviews: { select: { rating: true } } },
                },
              },
              orderBy: {
                product: { available_quantity: "desc" },
              },
            },
          },
        }),
        ctx.prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        }),
      ]);

      if (!order) {
        return null;
      }

      // Get product IDs from order
      const productIds = order.ordered_products.map((item) => item.product_id);

      // Check which products the user has reviewed
      const userReviews = await ctx.prisma.review.findMany({
        where: {
          user_id: userId,
          product_id: { in: productIds },
        },
        select: { product_id: true },
      });

      const reviewedProductIds = new Set<number>();
      for (const review of userReviews) {
        if (review.product_id) {
          reviewedProductIds.add(review.product_id);
        }
      }

      const wishlistProductIds = new Set(
        wishlistItems.map((w) => w.product_id),
      );

      return mapOrder(order, reviewedProductIds, wishlistProductIds);
    });
  }

  @Mutation(() => OrderMutationResponse)
  @authRequired()
  async createOrder(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateOrderInput) input: CreateOrderInput,
  ): Promise<OrderMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      // Get cart items
      const cartItems = await ctx.prisma.cart.findMany({
        where: { user_id: userId },
        include: { product: true },
      });

      if (cartItems.length === 0) {
        return {
          success: false,
          order: null,
          error: "Cart is empty",
        };
      }

      // Calculate totals
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const total = subtotal + input.shippingFee;

      // Create order and clear cart in transaction
      const [order] = await ctx.prisma.$transaction([
        ctx.prisma.productOrder.create({
          data: {
            user_id: userId,
            shipping_fee: input.shippingFee,
            subtotal,
            total,
            status: PrismaOrderStatus.PENDING,
            request_at: new Date(),
            shipping_address: input.shippingAddress,
            ordered_products: {
              create: cartItems.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.product.price,
              })),
            },
          },
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            ordered_products: {
              include: {
                product: {
                  include: { reviews: { select: { rating: true } } },
                },
              },
            },
          },
        }),
        ctx.prisma.cart.deleteMany({
          where: { user_id: userId },
        }),
      ]);

      // Get wishlist for the user
      const wishlistItems = await ctx.prisma.wishlist.findMany({
        where: { user_id: userId },
        select: { product_id: true },
      });

      const wishlistProductIds = new Set(
        wishlistItems.map((w) => w.product_id),
      );
      const reviewedProductIds = new Set<number>(); // New orders won't have reviews

      return {
        success: true,
        order: mapOrder(order, reviewedProductIds, wishlistProductIds),
        error: null,
      };
    });
  }

  @Mutation(() => OrderMutationResponse)
  @authRequired()
  async cancelOrder(
    @Ctx() ctx: Context,
    @Arg("orderId", () => String) orderId: string,
  ): Promise<OrderMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      // Verify order belongs to user
      const existingOrder = await ctx.prisma.productOrder.findFirst({
        where: {
          id: orderId,
          user_id: userId,
        },
      });

      if (!existingOrder) {
        return {
          success: false,
          order: null,
          error: "Order not found",
        };
      }

      if (existingOrder.status !== PrismaOrderStatus.PROCESSING) {
        return {
          success: false,
          order: null,
          error: "Only processing orders can be cancelled",
        };
      }

      const [updatedOrder, wishlistItems] = await Promise.all([
        ctx.prisma.productOrder.update({
          where: { id: orderId },
          data: {
            status: PrismaOrderStatus.CANCELLED,
            cancelled_at: new Date(),
          },
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            ordered_products: {
              include: {
                product: {
                  include: { reviews: { select: { rating: true } } },
                },
              },
            },
          },
        }),
        ctx.prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        }),
      ]);

      // Get product IDs from order
      const productIds = updatedOrder.ordered_products.map(
        (item) => item.product_id,
      );

      // Check which products the user has reviewed
      const userReviews = await ctx.prisma.review.findMany({
        where: {
          user_id: userId,
          product_id: { in: productIds },
        },
        select: { product_id: true },
      });

      const reviewedProductIds = new Set<number>();
      for (const review of userReviews) {
        if (review.product_id) {
          reviewedProductIds.add(review.product_id);
        }
      }

      const wishlistProductIds = new Set(
        wishlistItems.map((w) => w.product_id),
      );

      return {
        success: true,
        order: mapOrder(updatedOrder, reviewedProductIds, wishlistProductIds),
        error: null,
      };
    });
  }
}
