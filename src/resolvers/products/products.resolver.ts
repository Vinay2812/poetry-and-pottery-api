import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import type { Collection, Prisma } from "@/prisma/generated";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { productCache } from "./products.cache";
import {
  CategoryWithImage,
  CollectionBase,
  PriceHistogramBucket,
  ProductBase,
  ProductDetail,
  ProductOrderBy,
  ProductReview,
  ProductsFilterInput,
  ProductsMeta,
  ProductsResponse,
  RecommendedProductsResponse,
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
    case ProductOrderBy.BEST_SELLERS:
      return { purchased_products: { _count: "desc" as const } };
    default:
      return { created_at: "desc" as const };
  }
}

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
    is_active: boolean;
    reviews?: { rating: number }[];
    collection?: CollectionWithCount | null;
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
    in_wishlist: userWishlistIds ? userWishlistIds.has(product.id) : false,
    is_active: product.is_active,
    collection: mapCollection(product.collection ?? null),
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

      // Build cache key from filter
      const cacheFilter = {
        page,
        limit,
        search: filter.search,
        categories: filter.categories,
        materials: filter.materials,
        min_price: filter.min_price,
        max_price: filter.max_price,
        order_by: filter.order_by,
        collection_ids: filter.collection_ids,
        archive: filter.archive,
      };

      const cachedData = await productCache.list(cacheFilter, async () => {
        const offset = (page - 1) * limit;

        const priceFilter =
          filter.min_price !== undefined || filter.max_price !== undefined
            ? {
                price: {
                  ...(filter.min_price !== undefined && {
                    gte: filter.min_price,
                  }),
                  ...(filter.max_price !== undefined && {
                    lte: filter.max_price,
                  }),
                },
              }
            : {};

        const now = new Date();

        // Collection filter - filter by specific collection IDs
        const collectionFilter = filter.collection_ids?.length
          ? { collection_id: { in: filter.collection_ids } }
          : {};

        // Build the where clause based on archive flag
        let archiveConditions;
        if (filter.archive) {
          archiveConditions = {
            OR: [
              { is_active: false },
              { available_quantity: { lte: 0 } },
              {
                AND: [
                  { collection_id: { not: null } },
                  {
                    OR: [
                      { collection: { ends_at: { lt: now } } },
                      { collection: { starts_at: { gt: now } } },
                    ],
                  },
                ],
              },
            ],
          };
        } else {
          archiveConditions = {
            is_active: true,
            OR: [
              { collection_id: null },
              {
                AND: [
                  {
                    OR: [
                      { collection: { starts_at: null } },
                      { collection: { starts_at: { lte: now } } },
                    ],
                  },
                  {
                    OR: [
                      { collection: { ends_at: null } },
                      { collection: { ends_at: { gte: now } } },
                    ],
                  },
                ],
              },
            ],
          };
        }

        const where = {
          ...archiveConditions,
          ...(filter.search && {
            AND: [
              {
                OR: [
                  {
                    name: {
                      contains: filter.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    description: {
                      contains: filter.search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            ],
          }),
          ...priceFilter,
          ...(filter.categories?.length && {
            product_categories: {
              some: { category: { in: filter.categories } },
            },
          }),
          ...(filter.materials?.length && {
            material: { in: filter.materials },
          }),
          ...collectionFilter,
        };

        // Build where clause for price stats (respects other filters but not price filter)
        const priceStatsWhere = {
          ...archiveConditions,
          ...(filter.search && {
            OR: [
              {
                name: { contains: filter.search, mode: "insensitive" as const },
              },
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
          ...collectionFilter,
        };

        const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
          getOrderBy(filter.order_by),
          { id: "desc" },
        ];

        const [
          products,
          totalProducts,
          categoriesResult,
          materialsResult,
          priceStats,
          collectionsResult,
        ] = await Promise.all([
          ctx.prisma.product.findMany({
            where,
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
            orderBy,
            skip: offset,
            take: limit,
          }),
          ctx.prisma.product.count({ where }),
          ctx.prisma.productCategory.findMany({
            where: { product: { is_active: true } },
            distinct: ["category"],
            select: { category: true },
          }),
          ctx.prisma.product.findMany({
            where: { is_active: true },
            distinct: ["material"],
            select: { material: true },
          }),
          ctx.prisma.product.findMany({
            where: priceStatsWhere,
            select: { price: true },
          }),
          ctx.prisma.collection.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { products: true } } },
          }),
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        const mappedProducts = products.map((product) =>
          mapToProductBase(product),
        );

        // Slider bounds and histogram both use the price-excluded filter so the
        // distribution stays stable as the user drags the price slider. The slider
        // window only changes bar colors in the UI, not bar heights.
        const prices = priceStats.map((p) => p.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

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
          collections: collectionsResult.map((c) => ({
            ...c,
            products_count: c._count.products,
          })),
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
            collection_ids: filter.collection_ids,
            archive: filter.archive,
          },
          total_products: totalProducts,
          total_pages: totalPages,
          meta,
        };
      });

      // Add user-specific wishlist info
      if (userId) {
        const productIds = cachedData.products.map((p) => p.id);
        const wishlistItems = await ctx.prisma.wishlist.findMany({
          where: { user_id: userId, product_id: { in: productIds } },
          select: { product_id: true },
        });
        const wishlistIds = new Set(wishlistItems.map((w) => w.product_id));
        return {
          ...cachedData,
          products: cachedData.products.map((p) => ({
            ...p,
            in_wishlist: wishlistIds.has(p.id),
          })),
        };
      }

      return cachedData;
    });
  }

  @Query(() => ProductDetail, { nullable: true })
  async productById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<ProductDetail | null> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      const cachedProduct = await productCache.byId(id, async () => {
        const product = await ctx.prisma.product.findUnique({
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
            collection: {
              include: { _count: { select: { products: true } } },
            },
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
          in_wishlist: false,
          reviews: mappedReviews,
          collection: mapCollection(product.collection),
        };
      });

      if (!cachedProduct) return null;

      // Add user-specific wishlist info
      if (userId) {
        const wishlistItem = await ctx.prisma.wishlist.findFirst({
          where: { user_id: userId, product_id: cachedProduct.id },
        });
        return { ...cachedProduct, in_wishlist: !!wishlistItem };
      }

      return cachedProduct;
    });
  }

  @Query(() => [String])
  async categories(@Ctx() ctx: Context): Promise<string[]> {
    return tryCatchAsync(async () => {
      return productCache.categories(async () => {
        const categoryCounts = await ctx.prisma.productCategory.groupBy({
          by: ["category"],
          _count: { product_id: true },
          orderBy: { _count: { product_id: "desc" } },
        });
        return categoryCounts.map((c) => c.category);
      });
    });
  }

  @Query(() => [CollectionBase])
  async collections(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
  ): Promise<CollectionBase[]> {
    return tryCatchAsync(async () => {
      return productCache.collections(page, limit, async () => {
        const offset = (page - 1) * limit;
        const collections = await ctx.prisma.collection.findMany({
          skip: offset,
          take: limit,
          orderBy: { created_at: "desc" },
          include: { _count: { select: { products: true } } },
        });
        return collections.map((collection) => ({
          ...collection,
          products_count: collection._count.products,
        }));
      });
    });
  }

  @Query(() => [CategoryWithImage])
  async categoriesWithImages(
    @Ctx() ctx: Context,
  ): Promise<CategoryWithImage[]> {
    return tryCatchAsync(async () => {
      // Get unique categories from products
      const categoryData = await ctx.prisma.productCategory.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      });

      // Get category images from site settings
      const setting = await ctx.prisma.siteSetting.findUnique({
        where: { key: "category_images" },
      });

      const categoryImages: Record<string, string> =
        setting && typeof setting.value === "object" && setting.value !== null
          ? (setting.value as Record<string, string>)
          : {};

      return categoryData.map((c) => ({
        name: c.category,
        image_url: categoryImages[c.category] || null,
      }));
    });
  }

  @Query(() => RecommendedProductsResponse)
  async recommendedProducts(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
    @Arg("productId", () => Int, { nullable: true }) productId?: number,
  ): Promise<RecommendedProductsResponse> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;
      const offset = (page - 1) * limit;

      // Get user's purchased product categories for personalization
      let userCategories: string[] = [];
      if (userId) {
        const purchasedProducts =
          await ctx.prisma.purchasedProductItem.findMany({
            where: { order: { user_id: userId } },
            include: {
              product: {
                include: { product_categories: { select: { category: true } } },
              },
            },
            take: 20,
          });
        userCategories = [
          ...new Set(
            purchasedProducts.flatMap((p) =>
              p.product.product_categories.map((c) => c.category),
            ),
          ),
        ];
      }

      // If we have a productId, get its categories for "related" recommendations
      let productCategories: string[] = [];
      if (productId) {
        const product = await ctx.prisma.product.findUnique({
          where: { id: productId },
          include: { product_categories: { select: { category: true } } },
        });
        if (product) {
          productCategories = product.product_categories.map((c) => c.category);
        }
      }

      const categoriesToUse =
        productCategories.length > 0 ? productCategories : userCategories;

      const now = new Date();

      const baseWhere = {
        is_active: true,
        available_quantity: { gt: 0 },
        OR: [
          { collection_id: null },
          {
            AND: [
              {
                OR: [
                  { collection: { starts_at: null } },
                  { collection: { starts_at: { lte: now } } },
                ],
              },
              {
                OR: [
                  { collection: { ends_at: null } },
                  { collection: { ends_at: { gte: now } } },
                ],
              },
            ],
          },
        ],
        ...(productId && { id: { not: productId } }),
      };

      // Try to get products from user's preferred categories first
      let products;
      let total;

      if (categoriesToUse.length > 0) {
        const categoryWhere = {
          ...baseWhere,
          product_categories: {
            some: { category: { in: categoriesToUse } },
          },
        };

        [products, total] = await Promise.all([
          ctx.prisma.product.findMany({
            where: categoryWhere,
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
            orderBy: [
              { purchased_products: { _count: "desc" } },
              { id: "desc" },
            ],
            skip: offset,
            take: limit,
          }),
          ctx.prisma.product.count({ where: categoryWhere }),
        ]);

        // If not enough products, fill with popular products
        if (products.length < limit) {
          const remainingLimit = limit - products.length;
          const excludeIds = products.map((p) => p.id);
          if (productId) excludeIds.push(productId);

          const additionalProducts = await ctx.prisma.product.findMany({
            where: {
              ...baseWhere,
              id: { notIn: excludeIds },
            },
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
            orderBy: [
              { purchased_products: { _count: "desc" } },
              { id: "desc" },
            ],
            take: remainingLimit,
          });

          products = [...products, ...additionalProducts];
        }
      } else {
        // No categories to use, just get popular products
        [products, total] = await Promise.all([
          ctx.prisma.product.findMany({
            where: baseWhere,
            include: {
              reviews: { select: { rating: true } },
              collection: {
                include: { _count: { select: { products: true } } },
              },
            },
            orderBy: [
              { purchased_products: { _count: "desc" } },
              { id: "desc" },
            ],
            skip: offset,
            take: limit,
          }),
          ctx.prisma.product.count({ where: baseWhere }),
        ]);
      }

      // Get user's wishlist
      let wishlistIds = new Set<number>();
      if (userId) {
        const productIds = products.map((p) => p.id);
        const wishlistItems = await ctx.prisma.wishlist.findMany({
          where: { user_id: userId, product_id: { in: productIds } },
          select: { product_id: true },
        });
        wishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const mappedProducts = products.map((product) =>
        mapToProductBase(product, wishlistIds),
      );

      return {
        products: mappedProducts,
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  }
}
