import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import type { Collection, Prisma } from "@/prisma/generated";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  BestSellersResponse,
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
    wishlists?: { id: number }[];
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
    in_wishlist: userWishlistIds
      ? userWishlistIds.has(product.id)
      : (product.wishlists?.length ?? 0) > 0,
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
      const offset = (page - 1) * limit;
      const isFeaturedSort =
        filter.order_by === ProductOrderBy.FEATURED || !filter.order_by;

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
      // Archive = products that are inactive, sold out, or have an expired/not-yet-started collection
      let archiveConditions;
      if (filter.archive) {
        // Archive: is_active=false OR available_quantity=0 OR (collection exists AND now outside window)
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
        // Active: is_active=true AND (no collection OR collection window includes now)
        // Collection is active when: (starts_at is null OR starts_at <= now) AND (ends_at is null OR ends_at >= now)
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

      let userWishlistIds: Set<number> | undefined;
      let userPreferredCategories: string[] = [];

      if (userId) {
        // Fetch user preferences for featured sorting and wishlist IDs in parallel
        const [wishlistItems, cartItems, orderItems] = await Promise.all([
          ctx.prisma.wishlist.findMany({
            where: { user_id: userId },
            select: {
              product_id: true,
              product: {
                include: { product_categories: { select: { category: true } } },
              },
            },
          }),
          ctx.prisma.cart.findMany({
            where: { user_id: userId },
            select: {
              product: {
                include: { product_categories: { select: { category: true } } },
              },
            },
          }),
          ctx.prisma.purchasedProductItem.findMany({
            where: { order: { user_id: userId } },
            select: {
              product: {
                include: { product_categories: { select: { category: true } } },
              },
            },
          }),
        ]);

        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));

        // Extract categories from wishlist, cart, and orders for featured sorting
        if (isFeaturedSort) {
          const wishlistCategories = wishlistItems.flatMap((w) =>
            w.product.product_categories.map((c) => c.category),
          );
          const cartCategories = cartItems.flatMap((c) =>
            c.product.product_categories.map((pc) => pc.category),
          );
          const orderCategories = orderItems.flatMap((o) =>
            o.product.product_categories.map((pc) => pc.category),
          );
          userPreferredCategories = [
            ...new Set([
              ...wishlistCategories,
              ...cartCategories,
              ...orderCategories,
            ]),
          ];
        }
      }

      const productInclude = {
        reviews: { select: { rating: true } },
        collection: {
          include: { _count: { select: { products: true } } },
        },
      };
      type ProductWithRelations = Prisma.ProductGetPayload<{
        include: typeof productInclude;
      }>;

      const featuredOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
        { purchased_products: { _count: "desc" } },
        { id: "desc" },
      ];
      const standardOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
        getOrderBy(filter.order_by),
        { id: "desc" },
      ];

      // Featured sorting with user preferences: build a stable ordered ID list
      let products: ProductWithRelations[];
      if (isFeaturedSort && userPreferredCategories.length > 0) {
        const preferredWhere = {
          ...where,
          product_categories: {
            some: { category: { in: userPreferredCategories } },
          },
        };

        const preferredIdsResult = await ctx.prisma.product.findMany({
          where: preferredWhere,
          select: { id: true },
          orderBy: featuredOrderBy,
          take: offset + limit,
        });
        const preferredIds = preferredIdsResult.map((item) => item.id);

        const otherIdsResult = await ctx.prisma.product.findMany({
          where: {
            ...where,
            ...(preferredIds.length > 0 && { id: { notIn: preferredIds } }),
          },
          select: { id: true },
          orderBy: featuredOrderBy,
          take: offset + limit,
        });
        const otherIds = otherIdsResult.map((item) => item.id);

        const orderedIds: number[] = [];
        const seenIds = new Set<number>();
        for (const id of preferredIds) {
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          orderedIds.push(id);
        }
        for (const id of otherIds) {
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          orderedIds.push(id);
        }
        const pageIds = orderedIds.slice(offset, offset + limit);

        if (pageIds.length === 0) {
          products = [];
        } else {
          const pageProducts = await ctx.prisma.product.findMany({
            where: { id: { in: pageIds } },
            include: productInclude,
          });
          const productMap = new Map(
            pageProducts.map((product) => [product.id, product]),
          );
          products = pageIds.flatMap((id) => {
            const product = productMap.get(id);
            return product ? [product] : [];
          });
        }
      } else {
        // Standard ordering
        products = await ctx.prisma.product.findMany({
          where,
          include: productInclude,
          orderBy: standardOrderBy,
          skip: offset,
          take: limit,
        });
      }

      const totalProducts = await ctx.prisma.product.count({ where });

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

      const [categoriesResult, materialsResult, priceStats, collectionsResult] =
        await Promise.all([
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
  }

  @Query(() => ProductDetail, { nullable: true })
  async productBySlug(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
  ): Promise<ProductDetail | null> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      const product = await ctx.prisma.product.findUnique({
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
        in_wishlist:
          Array.isArray(product.wishlists) && product.wishlists.length > 0,
        reviews: mappedReviews,
        collection: mapCollection(product.collection),
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
          wishlists: userId ? { where: { user_id: userId } } : false,
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
        in_wishlist:
          Array.isArray(product.wishlists) && product.wishlists.length > 0,
        reviews: mappedReviews,
        collection: mapCollection(product.collection),
      };
    });
  }

  @Query(() => BestSellersResponse)
  async bestSellers(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 8,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
  ): Promise<BestSellersResponse> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;
      const offset = (page - 1) * limit;

      let userWishlistIds: Set<number> | undefined;
      if (userId) {
        const wishlistItems = await ctx.prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      const where = {
        is_active: true,
        available_quantity: { gt: 0 },
      };

      const [products, total] = await Promise.all([
        ctx.prisma.product.findMany({
          where,
          include: {
            reviews: { select: { rating: true } },
            collection: {
              where: {
                OR: [
                  { starts_at: null },
                  { starts_at: { lte: new Date() } },
                  { ends_at: null },
                  { ends_at: { gte: new Date() } },
                ],
              },
              include: { _count: { select: { products: true } } },
            },
          },
          orderBy: {
            purchased_products: { _count: "desc" },
          },
          skip: offset,
          take: limit,
        }),
        ctx.prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products: products.map((product) =>
          mapToProductBase(product, userWishlistIds),
        ),
        total,
        page,
        total_pages: totalPages,
      };
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

      let userWishlistIds: Set<number> | undefined;
      let categoryPreferences: string[] = [];

      // Get user's wishlist for in_wishlist field
      if (userId) {
        const wishlistItems = await ctx.prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        userWishlistIds = new Set(wishlistItems.map((w) => w.product_id));
      }

      // If productId is provided, use category-based recommendations (like relatedProducts)
      if (productId) {
        const productCategories = await ctx.prisma.productCategory.findMany({
          where: { product_id: productId },
          select: { category: true },
        });
        categoryPreferences = productCategories.map((c) => c.category);
      } else if (userId) {
        // Use personalized recommendations based on user's purchase/wishlist history
        const [userPurchases, userWishlists] = await Promise.all([
          ctx.prisma.purchasedProductItem.findMany({
            where: { order: { user_id: userId } },
            include: {
              product: {
                include: {
                  product_categories: { select: { category: true } },
                },
              },
            },
          }),
          ctx.prisma.wishlist.findMany({
            where: { user_id: userId },
            include: {
              product: {
                include: {
                  product_categories: { select: { category: true } },
                },
              },
            },
          }),
        ]);

        const purchaseCategories = userPurchases.flatMap((p) =>
          p.product.product_categories.map((c) => c.category),
        );
        const wishlistCategories = userWishlists.flatMap((w) =>
          w.product.product_categories.map((c) => c.category),
        );
        categoryPreferences = [
          ...new Set([...purchaseCategories, ...wishlistCategories]),
        ];
      }

      // Build exclude list (exclude the product being viewed and user's wishlist items)
      const excludeIds: number[] = [];
      if (productId) excludeIds.push(productId);

      // Build where clause based on whether we have category preferences
      const baseWhere: Prisma.ProductWhereInput = {
        is_active: true,
        available_quantity: { gt: 0 },
        ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
      };

      let whereClause;
      if (categoryPreferences.length > 0) {
        whereClause = {
          ...baseWhere,
          product_categories: {
            some: { category: { in: categoryPreferences } },
          },
        };
      } else {
        whereClause = baseWhere;
      }

      // Get total count for pagination
      const total = await ctx.prisma.product.count({ where: whereClause });

      // Get products with pagination
      let products = await ctx.prisma.product.findMany({
        where: whereClause,
        include: {
          reviews: { select: { rating: true } },
          collection: {
            where: {
              OR: [
                { starts_at: null },
                { starts_at: { lte: new Date() } },
                { ends_at: null },
                { ends_at: { gte: new Date() } },
              ],
            },
            include: { _count: { select: { products: true } } },
          },
        },
        orderBy: {
          purchased_products: { _count: "desc" },
        },
        skip: offset,
        take: limit,
      });

      // If we don't have enough products from category preferences, fill with best sellers
      if (products.length < limit && categoryPreferences.length > 0) {
        const existingIds = products.map((p) => p.id);
        const additionalProducts = await ctx.prisma.product.findMany({
          where: {
            is_active: true,
            available_quantity: { gt: 0 },
            id: { notIn: [...excludeIds, ...existingIds] },
          },
          include: {
            reviews: { select: { rating: true } },
            collection: {
              include: { _count: { select: { products: true } } },
            },
          },
          orderBy: {
            purchased_products: { _count: "desc" },
          },
          take: limit - products.length,
        });
        products = [...products, ...additionalProducts];
      }

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        products: products.map((product) =>
          mapToProductBase(product, userWishlistIds),
        ),
        total,
        page,
        total_pages: totalPages,
      };
    });
  }

  @Query(() => [String])
  async categories(@Ctx() ctx: Context): Promise<string[]> {
    return tryCatchAsync(async () => {
      const categoryCounts = await ctx.prisma.productCategory.groupBy({
        by: ["category"],
        _count: {
          product_id: true,
        },
        orderBy: {
          _count: {
            product_id: "desc",
          },
        },
      });

      return categoryCounts.map((c) => c.category);
    });
  }

  @Query(() => [CategoryWithImage])
  async categoriesWithImages(
    @Ctx() ctx: Context,
  ): Promise<CategoryWithImage[]> {
    return tryCatchAsync(async () => {
      const categoryCounts = await ctx.prisma.productCategory.groupBy({
        by: ["category"],
        _count: { product_id: true },
        orderBy: { _count: { product_id: "desc" } },
      });

      const categories = await Promise.all(
        categoryCounts.map(async (c) => {
          const productCategory = await ctx.prisma.productCategory.findFirst({
            where: { category: c.category },
            include: {
              product: {
                select: { image_urls: true },
              },
            },
          });

          return {
            name: c.category,
            image_url: productCategory?.product?.image_urls?.[0] ?? null,
          };
        }),
      );

      return categories;
    });
  }

  @Query(() => [String])
  async materials(@Ctx() ctx: Context): Promise<string[]> {
    return tryCatchAsync(async () => {
      const materials = await ctx.prisma.product.findMany({
        where: { is_active: true },
        distinct: ["material"],
        select: { material: true },
      });
      return materials.map((m) => m.material);
    });
  }

  @Query(() => [CollectionBase])
  async collections(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
  ): Promise<CollectionBase[]> {
    return tryCatchAsync(async () => {
      const offset = (page - 1) * limit;
      const collections = await ctx.prisma.collection.findMany({
        skip: offset,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
      return collections.map((collection) => ({
        ...collection,
        products_count: collection._count.products,
      }));
    });
  }
}
