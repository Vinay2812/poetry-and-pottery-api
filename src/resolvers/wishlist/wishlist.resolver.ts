import { GraphQLError } from "graphql";
import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { authRequired } from "@/middlewares/auth.middleware";
import type { Collection } from "@/prisma/generated";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { CollectionBase } from "../products/products.type";
import {
  ToggleAction,
  ToggleWishlistResponse,
  WishlistFilterInput,
  WishlistItem,
  WishlistMutationResponse,
  WishlistResponse,
} from "./wishlist.type";

type CollectionWithCount = Collection & { _count: { products: number } };

function mapCollection(
  collection: CollectionWithCount | null,
): CollectionBase | null {
  if (!collection) return null;
  return {
    ...collection,
    products_count: collection._count.products,
  };
}

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
  is_active: boolean;
  reviews?: { rating: number }[];
  collection?: CollectionWithCount | null;
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
    in_wishlist: true,
    is_active: product.is_active,
    collection: mapCollection(product.collection ?? null),
  };
}

function mapWishlistItem(wishlist: {
  id: number;
  user_id: number;
  product_id: number;
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
    is_active: boolean;
    reviews?: { rating: number }[];
    collection?: CollectionWithCount | null;
  };
}): WishlistItem {
  return {
    id: wishlist.id,
    user_id: wishlist.user_id,
    product_id: wishlist.product_id,
    created_at: wishlist.created_at,
    updated_at: wishlist.updated_at,
    product: mapToProductBase(wishlist.product),
  };
}

@Resolver()
export class WishlistResolver {
  @Query(() => WishlistResponse)
  @authRequired()
  async wishlist(
    @Ctx() ctx: Context,
    @Arg("filter", () => WishlistFilterInput, { nullable: true })
    filter?: WishlistFilterInput,
  ): Promise<WishlistResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;
      const offset = (page - 1) * limit;

      const [wishlistItems, total] = await Promise.all([
        prisma.wishlist.findMany({
          where: { user_id: userId },
          include: {
            product: {
              include: {
                reviews: { select: { rating: true } },
                collection: {
                  include: { _count: { select: { products: true } } },
                },
              },
            },
          },
          orderBy: [
            { product: { available_quantity: "desc" } },
            { created_at: "desc" },
          ],
          skip: offset,
          take: limit,
        }),
        prisma.wishlist.count({ where: { user_id: userId } }),
      ]);

      const data = wishlistItems.map(mapWishlistItem);
      const totalPages = Math.ceil(total / limit);

      return { data, total, page, total_pages: totalPages };
    });
  }

  @Query(() => [Int])
  @authRequired()
  async wishlistIds(@Ctx() ctx: Context): Promise<number[]> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const wishlistItems = await prisma.wishlist.findMany({
        where: { user_id: userId },
        select: { product_id: true },
      });

      return wishlistItems.map((item) => item.product_id);
    });
  }

  @Mutation(() => WishlistMutationResponse)
  @authRequired()
  async addToWishlist(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<WishlistMutationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const existing = await prisma.wishlist.findUnique({
        where: {
          user_id_product_id_custom_data_hash: {
            user_id: userId,
            product_id: productId,
            custom_data_hash: "",
          },
        },
      });

      if (existing) {
        const wishlist = await prisma.wishlist.findUnique({
          where: { id: existing.id },
          include: {
            product: {
              include: {
                reviews: { select: { rating: true } },
                collection: {
                  include: { _count: { select: { products: true } } },
                },
              },
            },
          },
        });

        return {
          success: true,
          item: wishlist ? mapWishlistItem(wishlist) : null,
        };
      }

      const wishlist = await prisma.wishlist.create({
        data: {
          user_id: userId,
          product_id: productId,
        },
        include: {
          product: {
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
          },
        },
      });

      return {
        success: true,
        item: mapWishlistItem(wishlist),
      };
    });
  }

  @Mutation(() => Boolean)
  @authRequired()
  async removeFromWishlist(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<boolean> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      await prisma.wishlist.delete({
        where: {
          user_id_product_id_custom_data_hash: {
            user_id: userId,
            product_id: productId,
            custom_data_hash: "",
          },
        },
      });

      return true;
    });
  }

  @Mutation(() => ToggleWishlistResponse)
  @authRequired()
  async toggleWishlist(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<ToggleWishlistResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const existing = await prisma.wishlist.findUnique({
        where: {
          user_id_product_id_custom_data_hash: {
            user_id: userId,
            product_id: productId,
            custom_data_hash: "",
          },
        },
      });

      if (existing) {
        await prisma.wishlist.delete({
          where: { id: existing.id },
        });

        return {
          success: true,
          action: ToggleAction.REMOVED,
          item: null,
        };
      }

      const wishlist = await prisma.wishlist.create({
        data: {
          user_id: userId,
          product_id: productId,
        },
        include: {
          product: {
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
          },
        },
      });

      return {
        success: true,
        action: ToggleAction.ADDED,
        item: mapWishlistItem(wishlist),
      };
    });
  }

  @Mutation(() => Boolean)
  @authRequired()
  async moveToCart(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<boolean> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      await prisma.$transaction(async (tx) => {
        await tx.cart.upsert({
          where: {
            user_id_product_id_custom_data_hash: {
              user_id: userId,
              product_id: productId,
              custom_data_hash: "",
            },
          },
          update: {
            quantity: { increment: 1 },
          },
          create: {
            user_id: userId,
            product_id: productId,
            quantity: 1,
            custom_data_hash: "",
          },
        });

        await tx.wishlist.delete({
          where: {
            user_id_product_id_custom_data_hash: {
              user_id: userId,
              product_id: productId,
              custom_data_hash: "",
            },
          },
        });
      });

      return true;
    });
  }
}
