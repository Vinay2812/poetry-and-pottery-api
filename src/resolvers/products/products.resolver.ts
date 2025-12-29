import { Arg, Ctx, Int, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { getProducts, getRecommendedProducts } from "@/prisma/generated/sql";
import { Context } from "@/types/context";
import { pickManyUnique } from "@/utils/randomize";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  ProductBase,
  ProductsFilterInput,
  ProductsResponse,
} from "./products.type";

@Resolver()
export class ProductsResolver {
  @Query(() => [ProductBase])
  async recommendedProducts(
    @Ctx() ctx: Context,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 10,
  ): Promise<ProductBase[]> {
    return tryCatchAsync(async () => {
      const userId = ctx.user?.dbUserId ?? null;

      // Order by most ordered products and highest rated products
      const products = await prisma.$queryRawTyped(
        getRecommendedProducts(limit, userId),
      );

      // Map raw SQL result to ProductBase type
      const mappedProducts: ProductBase[] = products.map((product) => ({
        ...product,
        image_urls: product.image_urls ?? [],
        reviews_count: Number(product.reviews_count ?? 0),
        avg_rating: Number(product.avg_rating ?? 0),
        in_wishlist: Boolean(product.in_wishlist ?? false),
      }));

      // Pick random products from the list
      const randomProducts = pickManyUnique(mappedProducts, limit);

      return randomProducts;
    });
  }

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

      // Convert arrays to comma-separated strings for SQL
      const categoriesParam = filter.categories?.join(",") ?? null;
      const materialsParam = filter.materials?.join(",") ?? null;

      const results = await prisma.$queryRawTyped(
        getProducts(
          limit,
          offset,
          filter.search ?? null,
          categoriesParam,
          materialsParam,
          filter.min_price ?? null,
          filter.max_price ?? null,
          filter.order_by ?? null,
          userId,
        ),
      );

      const totalProducts = Number(results[0]?.total_count ?? 0);
      const totalPages = Math.ceil(totalProducts / limit);

      // Extract available filter options from first result
      const firstResult = results[0];
      const availableCategories =
        (firstResult?.available_categories as string[] | null) ?? [];
      const availableMaterials =
        (firstResult?.available_materials as string[] | null) ?? [];
      const minAvailablePrice = firstResult?.min_available_price ?? null;
      const maxAvailablePrice = firstResult?.max_available_price ?? null;

      // Map raw SQL result to ProductBase type
      const mappedProducts: ProductBase[] = results.map((product) => ({
        ...product,
        image_urls: product.image_urls ?? [],
        reviews_count: Number(product.reviews_count ?? 0),
        avg_rating: Number(product.avg_rating ?? 0),
        in_wishlist: Boolean(product.in_wishlist ?? false),
      }));

      return {
        products: mappedProducts,
        filter: {
          limit,
          page,
          search: filter.search,
          // Use provided filters or fall back to available options
          categories: filter.categories,
          materials: filter.materials,
          min_price: filter.min_price ?? minAvailablePrice,
          max_price: filter.max_price ?? maxAvailablePrice,
          order_by: filter.order_by,
        },
        total_products: totalProducts,
        total_pages: totalPages,
      };
    });
  }
}
