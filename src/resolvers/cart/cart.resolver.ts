import { GraphQLError } from "graphql";
import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AddToCartInput,
  CartItem,
  CartMutationResponse,
  CartResponse,
  UpdateCartQuantityInput,
} from "./cart.type";

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

function mapCartItem(
  cart: {
    id: number;
    user_id: number;
    product_id: number;
    quantity: number;
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
  userWishlistIds?: Set<number>,
): CartItem {
  const productBase = mapToProductBase(cart.product);
  if (userWishlistIds) {
    productBase.in_wishlist = userWishlistIds.has(cart.product.id);
  }

  return {
    id: cart.id,
    user_id: cart.user_id,
    product_id: cart.product_id,
    quantity: cart.quantity,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    product: productBase,
  };
}

@Resolver()
export class CartResolver {
  @Query(() => CartResponse)
  @authRequired()
  async cart(@Ctx() ctx: Context): Promise<CartResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const [cartItems, wishlistItems] = await Promise.all([
        prisma.cart.findMany({
          where: { user_id: userId },
          include: {
            product: {
              include: {
                reviews: { select: { rating: true } },
              },
            },
          },
          orderBy: { created_at: "desc" },
        }),
        prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        }),
      ]);

      const userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      const items = cartItems.map((item) => mapCartItem(item, userWishlistIds));

      const total = items.length;
      const subtotal = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );

      return { items, total, subtotal };
    });
  }

  @Mutation(() => CartMutationResponse)
  @authRequired()
  async addToCart(
    @Ctx() ctx: Context,
    @Arg("input", () => AddToCartInput) input: AddToCartInput,
  ): Promise<CartMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const quantity = input.quantity ?? 1;

      const cart = await prisma.cart.upsert({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: input.product_id,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          user_id: userId,
          product_id: input.product_id,
          quantity,
        },
        include: {
          product: {
            include: {
              reviews: { select: { rating: true } },
            },
          },
        },
      });

      const wishlistItem = await prisma.wishlist.findUnique({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: input.product_id,
          },
        },
      });

      const userWishlistIds = wishlistItem
        ? new Set([input.product_id])
        : new Set<number>();

      return {
        success: true,
        item: mapCartItem(cart, userWishlistIds),
      };
    });
  }

  @Mutation(() => CartMutationResponse)
  @authRequired()
  async updateCartQuantity(
    @Ctx() ctx: Context,
    @Arg("input", () => UpdateCartQuantityInput) input: UpdateCartQuantityInput,
  ): Promise<CartMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      if (input.quantity <= 0) {
        await prisma.cart.delete({
          where: {
            user_id_product_id: {
              user_id: userId,
              product_id: input.product_id,
            },
          },
        });

        return { success: true, item: null };
      }

      const cart = await prisma.cart.update({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: input.product_id,
          },
        },
        data: { quantity: input.quantity },
        include: {
          product: {
            include: {
              reviews: { select: { rating: true } },
            },
          },
        },
      });

      const wishlistItem = await prisma.wishlist.findUnique({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: input.product_id,
          },
        },
      });

      const userWishlistIds = wishlistItem
        ? new Set([input.product_id])
        : new Set<number>();

      return {
        success: true,
        item: mapCartItem(cart, userWishlistIds),
      };
    });
  }

  @Mutation(() => Boolean)
  @authRequired()
  async removeFromCart(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<boolean> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      await prisma.cart.delete({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: productId,
          },
        },
      });

      return true;
    });
  }

  @Mutation(() => Boolean)
  @authRequired()
  async clearCart(@Ctx() ctx: Context): Promise<boolean> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      await prisma.cart.deleteMany({
        where: { user_id: userId },
      });

      return true;
    });
  }
}
