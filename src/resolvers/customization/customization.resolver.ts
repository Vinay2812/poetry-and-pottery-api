import { Arg, Ctx, Query, Resolver } from "type-graphql";

import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  CustomizationCategoriesFilterInput,
  CustomizationCategoriesResponse,
  CustomizationCategory,
  CustomizationOptionsByType,
  CustomizationOptionsFilterInput,
  CustomizationOptionsResponse,
} from "./customization.type";

@Resolver()
export class CustomizationResolver {
  /**
   * Get all categories that have customization options
   * Supports search and pagination for infinite scroll
   */
  @Query(() => CustomizationCategoriesResponse)
  async customizationCategories(
    @Ctx() ctx: Context,
    @Arg("filter", () => CustomizationCategoriesFilterInput, { nullable: true })
    filter?: CustomizationCategoriesFilterInput,
  ): Promise<CustomizationCategoriesResponse> {
    return tryCatchAsync(async () => {
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 20;
      const skip = (page - 1) * limit;
      const search = filter?.search?.trim().toLowerCase();

      // Get unique categories with options count
      const categoriesWithCounts = await ctx.prisma.customizationOption.groupBy(
        {
          by: ["category"],
          where: {
            is_active: true,
            ...(search && {
              category: {
                contains: search,
                mode: "insensitive",
              },
            }),
          },
          _count: {
            id: true,
          },
          orderBy: {
            category: "asc",
          },
        },
      );

      // Get total count for pagination
      const total = categoriesWithCounts.length;

      // Apply pagination
      const paginatedCategories = categoriesWithCounts.slice(
        skip,
        skip + limit,
      );

      // Get base prices and images from products for each category
      const categoryNames = paginatedCategories.map((c) => c.category);

      // Get category data with min price and first image
      const categoryData = await ctx.prisma.productCategory.findMany({
        where: {
          category: {
            in: categoryNames,
          },
          product: {
            is_active: true,
          },
        },
        select: {
          category: true,
          product: {
            select: {
              price: true,
              image_urls: true,
            },
          },
        },
      });

      // Create maps for quick lookup
      const priceMap = new Map<string, number>();
      const imageMap = new Map<string, string | null>();

      for (const pc of categoryData) {
        const currentPrice = priceMap.get(pc.category);
        if (currentPrice === undefined || pc.product.price < currentPrice) {
          priceMap.set(pc.category, pc.product.price);
        }
        if (!imageMap.has(pc.category) && pc.product.image_urls.length > 0) {
          imageMap.set(pc.category, pc.product.image_urls[0]);
        }
      }

      // Build categories array
      const categories: CustomizationCategory[] = paginatedCategories.map(
        (c) => ({
          category: c.category,
          options_count: c._count.id,
          base_price: priceMap.get(c.category) ?? 0,
          image_url: imageMap.get(c.category) ?? null,
        }),
      );

      return {
        categories,
        total,
        page,
        limit,
        has_more: skip + limit < total,
      };
    });
  }

  /**
   * Get all customization options for a specific category
   * Grouped by type (SIZE, COLOR, SHAPE, TEXT, etc.)
   */
  @Query(() => CustomizationOptionsResponse)
  async customizationOptionsByCategory(
    @Ctx() ctx: Context,
    @Arg("filter", () => CustomizationOptionsFilterInput)
    filter: CustomizationOptionsFilterInput,
  ): Promise<CustomizationOptionsResponse> {
    return tryCatchAsync(async () => {
      const { category, type } = filter;

      // Get all active options for the category
      const options = await ctx.prisma.customizationOption.findMany({
        where: {
          category,
          is_active: true,
          ...(type && { type }),
        },
        orderBy: [{ type: "asc" }, { sort_order: "asc" }, { name: "asc" }],
      });

      // Group options by type
      const optionsByTypeMap = new Map<string, (typeof options)[0][]>();

      for (const option of options) {
        const existing = optionsByTypeMap.get(option.type) ?? [];
        existing.push(option);
        optionsByTypeMap.set(option.type, existing);
      }

      // Convert map to array
      const optionsByType: CustomizationOptionsByType[] = Array.from(
        optionsByTypeMap.entries(),
      ).map(([typeName, typeOptions]) => ({
        type: typeName,
        options: typeOptions,
      }));

      return {
        category,
        options_by_type: optionsByType,
        total_options: options.length,
      };
    });
  }

  /**
   * Get all unique customization types across all categories
   * Useful for filter chips
   */
  @Query(() => [String])
  async customizationTypes(@Ctx() ctx: Context): Promise<string[]> {
    return tryCatchAsync(async () => {
      const types = await ctx.prisma.customizationOption.findMany({
        where: { is_active: true },
        select: { type: true },
        distinct: ["type"],
        orderBy: { type: "asc" },
      });

      return types.map((t) => t.type);
    });
  }
}
