import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { Context } from "@/types/context";
import { pickManyUnique } from "@/utils/randomize";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  PriceHistogramBucket,
  ProductBase,
  ProductDetail,
  ProductOrderBy,
  ProductReview,
  ProductsFilterInput,
  ProductsMeta,
  ProductsResponse,
} from "./products.type";

function getOrderBy(orderBy?: ProductOrderBy) {
  switch (orderBy) {
    case ProductOrderBy.NEW:
      return { created_at: "desc" as const };
    case ProductOrderBy.PRICE_LOW_TO_HIGH:
      return { price: "asc" as const };
    case ProductOrderBy.PRICE_HIGH_TO_LOW:
      return { price: "desc" as const };
    case ProductOrderBy.FEATURED:
    default:
      return { created_at: "desc" as const };
  }
}

function mapToProductBase(
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
    wishlists?: { id: number }[];
  },
  userWishlistIds?: Set<number>,
): ProductBase {
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
    in_wishlist: userWishlistIds
      ? userWishlistIds.has(product.id)
      : (product.wishlists?.length ?? 0) > 0,
  };
}

@Resolver()
export class ProductsResolver {
  @Query(() => ProductsResponse)
  async products(
    @Ctx() ctx: Context,
    @Arg("filter", () => ProductsFilterInput) filter: ProductsFilterInput,
  ): Promise<ProductsResponse> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;
      const limit = filter.limit ?? 12;
      const page = filter.page ?? 1;
      const offset = (page - 1) * limit;

      const where = {
        is_active: true,
        ...(filter.search && {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" as const } },
            {
              description: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
        ...(filter.min_price !== undefined && {
          price: { gte: filter.min_price },
        }),
        ...(filter.max_price !== undefined && {
          price: { ...{ lte: filter.max_price } },
        }),
        ...(filter.categories?.length && {
          product_categories: {
            some: { category: { in: filter.categories } },
          },
        }),
        ...(filter.materials?.length && {
          material: { in: filter.materials },
        }),
      };

      let userWishlistIds: Set<number> | undefined;
      if (userId) {
        const wishlistItems = await prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const [products, totalProducts] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            reviews: { select: { rating: true } },
          },
          orderBy: getOrderBy(filter.order_by),
          skip: offset,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      // Build where clause for price stats (respects other filters but not price filter)
      const priceStatsWhere = {
        is_active: true,
        ...(filter.search && {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" as const } },
            {
              description: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
        ...(filter.categories?.length && {
          product_categories: {
            some: { category: { in: filter.categories } },
          },
        }),
        ...(filter.materials?.length && {
          material: { in: filter.materials },
        }),
      };

      const [categoriesResult, materialsResult, priceStats] = await Promise.all(
        [
          prisma.productCategory.findMany({
            where: { product: { is_active: true } },
            distinct: ["category"],
            select: { category: true },
          }),
          prisma.product.findMany({
            where: { is_active: true },
            distinct: ["material"],
            select: { material: true },
          }),
          prisma.product.findMany({
            where: priceStatsWhere,
            select: { price: true },
          }),
        ],
      );

      const totalPages = Math.ceil(totalProducts / limit);

      const mappedProducts = products.map((product) =>
        mapToProductBase(product, userWishlistIds),
      );

      // Calculate price range and histogram
      const prices = priceStats.map((p) => p.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // Generate histogram (30 buckets)
      const bucketCount = 30;
      const range = maxPrice - minPrice || 1;
      const step = range / bucketCount;

      const priceHistogram: PriceHistogramBucket[] = Array.from(
        { length: bucketCount },
        (_, i) => {
          const bucketMin = Math.round(minPrice + i * step);
          const bucketMax = Math.round(minPrice + (i + 1) * step);
          const count = prices.filter(
            (p) =>
              p >= bucketMin &&
              (i === bucketCount - 1 ? p <= bucketMax : p < bucketMax),
          ).length;
          return { min: bucketMin, max: bucketMax, count };
        },
      );

      const meta: ProductsMeta = {
        categories: categoriesResult.map((c) => c.category),
        materials: materialsResult.map((m) => m.material),
        price_range: {
          min: minPrice,
          max: maxPrice,
        },
        price_histogram: priceHistogram,
      };

      return {
        products: mappedProducts,
        filter: {
          limit,
          page,
          search: filter.search,
          categories: filter.categories,
          materials: filter.materials,
          min_price: filter.min_price ?? meta.price_range.min,
          max_price: filter.max_price ?? meta.price_range.max,
          order_by: filter.order_by,
        },
        total_products: totalProducts,
        total_pages: totalPages,
        meta,
      };
    });
  }

  @Query(() => ProductDetail, { nullable: true })
  async productBySlug(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
  ): Promise<ProductDetail | null> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          product_categories: { select: { category: true } },
          reviews: {
            include: {
              user: { select: { id: true, name: true, image: true } },
              likes: { select: { id: true, user_id: true } },
            },
            orderBy: { created_at: "desc" },
          },
          wishlists: userId ? { where: { user_id: userId } } : false,
        },
      });

      if (!product) return null;

      const reviews = product.reviews ?? [];
      const reviewsCount = reviews.length;
      const avgRating =
        reviewsCount > 0
          ? Math.round(
              reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount,
            )
          : 0;

      const mappedReviews: ProductReview[] = reviews.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        rating: r.rating,
        review: r.review,
        image_urls: r.image_urls,
        created_at: r.created_at,
        user: r.user
          ? { id: r.user.id, name: r.user.name, image: r.user.image }
          : null,
        likes: r.likes.map((l) => ({ id: l.id, user_id: l.user_id })),
      }));

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
        description: product.description,
        instructions: product.instructions,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        categories: product.product_categories.map((c) => c.category),
        reviews_count: reviewsCount,
        avg_rating: avgRating,
        in_wishlist:
          Array.isArray(product.wishlists) && product.wishlists.length > 0,
        reviews: mappedReviews,
      };
    });
  }

  @Query(() => ProductDetail, { nullable: true })
  async productById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<ProductDetail | null> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          product_categories: { select: { category: true } },
          reviews: {
            include: {
              user: { select: { id: true, name: true, image: true } },
              likes: { select: { id: true, user_id: true } },
            },
            orderBy: { created_at: "desc" },
          },
          wishlists: userId ? { where: { user_id: userId } } : false,
        },
      });

      if (!product) return null;

      const reviews = product.reviews ?? [];
      const reviewsCount = reviews.length;
      const avgRating =
        reviewsCount > 0
          ? Math.round(
              reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount,
            )
          : 0;

      const mappedReviews: ProductReview[] = reviews.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        rating: r.rating,
        review: r.review,
        image_urls: r.image_urls,
        created_at: r.created_at,
        user: r.user
          ? { id: r.user.id, name: r.user.name, image: r.user.image }
          : null,
        likes: r.likes.map((l) => ({ id: l.id, user_id: l.user_id })),
      }));

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
        description: product.description,
        instructions: product.instructions,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        categories: product.product_categories.map((c) => c.category),
        reviews_count: reviewsCount,
        avg_rating: avgRating,
        in_wishlist:
          Array.isArray(product.wishlists) && product.wishlists.length > 0,
        reviews: mappedReviews,
      };
    });
  }

  @Query(() => [ProductBase])
  async relatedProducts(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 8,
  ): Promise<ProductBase[]> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      const productCategories = await prisma.productCategory.findMany({
        where: { product_id: productId },
        select: { category: true },
      });

      const categories = productCategories.map((c) => c.category);

      if (categories.length === 0) {
        return [];
      }

      let userWishlistIds: Set<number> | undefined;
      if (userId) {
        const wishlistItems = await prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const products = await prisma.product.findMany({
        where: {
          is_active: true,
          id: { not: productId },
          product_categories: {
            some: { category: { in: categories } },
          },
        },
        include: {
          reviews: { select: { rating: true } },
        },
        take: limit,
      });

      return products.map((product) =>
        mapToProductBase(product, userWishlistIds),
      );
    });
  }

  @Query(() => [ProductBase])
  async featuredProducts(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 8,
  ): Promise<ProductBase[]> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      let userWishlistIds: Set<number> | undefined;
      if (userId) {
        const wishlistItems = await prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const products = await prisma.product.findMany({
        where: {
          is_active: true,
          available_quantity: { gt: 0 },
        },
        include: {
          reviews: { select: { rating: true } },
          _count: { select: { purchased_products: true } },
        },
        orderBy: {
          purchased_products: { _count: "desc" },
        },
        take: limit,
      });

      return products.map((product) =>
        mapToProductBase(product, userWishlistIds),
      );
    });
  }

  @Query(() => [ProductBase])
  async bestSellers(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 8,
  ): Promise<ProductBase[]> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      let userWishlistIds: Set<number> | undefined;
      if (userId) {
        const wishlistItems = await prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const products = await prisma.product.findMany({
        where: {
          is_active: true,
          available_quantity: { gt: 0 },
        },
        include: {
          reviews: { select: { rating: true } },
        },
        orderBy: {
          purchased_products: { _count: "desc" },
        },
        take: limit,
      });

      return products.map((product) =>
        mapToProductBase(product, userWishlistIds),
      );
    });
  }

  @Query(() => [ProductBase])
  async recommendedProducts(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
  ): Promise<ProductBase[]> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      let userWishlistIds: Set<number> | undefined;
      let userCategoryPreferences: string[] = [];

      if (userId) {
        const [wishlistItems, userPurchases, userWishlists] = await Promise.all(
          [
            prisma.wishlist.findMany({
              where: { user_id: userId },
              select: { product_id: true },
            }),
            prisma.purchasedProductItem.findMany({
              where: { order: { user_id: userId } },
              include: {
                product: {
                  include: {
                    product_categories: { select: { category: true } },
                  },
                },
              },
            }),
            prisma.wishlist.findMany({
              where: { user_id: userId },
              include: {
                product: {
                  include: {
                    product_categories: { select: { category: true } },
                  },
                },
              },
            }),
          ],
        );

        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));

        const purchaseCategories = userPurchases.flatMap((p) =>
          p.product.product_categories.map((c) => c.category),
        );
        const wishlistCategories = userWishlists.flatMap((w) =>
          w.product.product_categories.map((c) => c.category),
        );
        userCategoryPreferences = [
          ...new Set([...purchaseCategories, ...wishlistCategories]),
        ];
      }

      const excludeIds = userWishlistIds ? [...userWishlistIds] : [];

      let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];

      if (userCategoryPreferences.length > 0) {
        const personalizedProducts = await prisma.product.findMany({
          where: {
            is_active: true,
            available_quantity: { gt: 0 },
            id: { notIn: excludeIds },
            product_categories: {
              some: { category: { in: userCategoryPreferences } },
            },
          },
          include: {
            reviews: { select: { rating: true } },
          },
          orderBy: {
            purchased_products: { _count: "desc" },
          },
          take: limit * 2,
        });
        products = personalizedProducts;
      }

      if (products.length < limit) {
        const additionalProducts = await prisma.product.findMany({
          where: {
            is_active: true,
            available_quantity: { gt: 0 },
            id: { notIn: [...excludeIds, ...products.map((p) => p.id)] },
          },
          include: {
            reviews: { select: { rating: true } },
          },
          orderBy: {
            purchased_products: { _count: "desc" },
          },
          take: limit * 2 - products.length,
        });
        products = [...products, ...additionalProducts];
      }

      const mappedProducts = products.map((product) =>
        mapToProductBase(product, userWishlistIds),
      );

      return pickManyUnique(mappedProducts, limit);
    });
  }
}
