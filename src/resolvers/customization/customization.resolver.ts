import { Arg, Ctx, Query, Resolver } from "type-graphql";

import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { customizationCache } from "./customization.cache";
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
  // Get all categories that have customization options
  // Supports search and pagination for infinite scroll
  @Query(() => CustomizationCategoriesResponse)
  async customizationCategories(
    @Ctx() ctx: Context,
    @Arg("filter", () => CustomizationCategoriesFilterInput, { nullable: true })
    filter?: CustomizationCategoriesFilterInput,
  ): Promise<CustomizationCategoriesResponse> {
    const cacheFilter = {
      page: filter?.page ?? 1,
      limit: filter?.limit ?? 20,
      search: filter?.search,
    };

    return customizationCache.categories(cacheFilter, async () => {
      return tryCatchAsync(async () => {
        const page = filter?.page ?? 1;
        const limit = filter?.limit ?? 20;
        const skip = (page - 1) * limit;
        const search = filter?.search?.trim().toLowerCase();

        // Get categories from CustomizeCategory table
        const categoriesWithCounts =
          await ctx.prisma.customizeCategory.findMany({
            where: {
              is_active: true,
              ...(search && {
                category: {
                  contains: search,
                  mode: "insensitive",
                },
              }),
            },
            include: {
              _count: {
                select: { options: true },
              },
            },
            orderBy: {
              category: "asc",
            },
          });

        // Get total count for pagination
        const total = categoriesWithCounts.length;

        // Apply pagination
        const paginatedCategories = categoriesWithCounts.slice(
          skip,
          skip + limit,
        );

        // Build categories array (base_price and image_url come from CustomizeCategory table now)
        const categories: CustomizationCategory[] = paginatedCategories.map(
          (c) => ({
            id: c.id,
            category: c.category,
            options_count: c._count.options,
            base_price: c.base_price,
            image_url: c.image_url,
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
    });
  }

  // Get all customization options for a specific category
  // Grouped by type (SIZE, COLOR, SHAPE, TEXT, etc.)
  @Query(() => CustomizationOptionsResponse)
  async customizationOptionsByCategory(
    @Ctx() ctx: Context,
    @Arg("filter", () => CustomizationOptionsFilterInput)
    filter: CustomizationOptionsFilterInput,
  ): Promise<CustomizationOptionsResponse> {
    return customizationCache.optionsByCategory(
      filter.customize_category_id,
      filter.type,
      async () => {
        return tryCatchAsync(async () => {
          const { customize_category_id, type } = filter;

          // Get the category to retrieve its name
          const customizeCategory =
            await ctx.prisma.customizeCategory.findUnique({
              where: { id: customize_category_id },
              select: { id: true, category: true },
            });

          if (!customizeCategory) {
            return {
              customize_category_id,
              category_name: "",
              options_by_type: [],
              total_options: 0,
            };
          }

          // Get all active options for the category
          const options = await ctx.prisma.customizationOption.findMany({
            where: {
              customize_category_id,
              is_active: true,
              ...(type && { type }),
            },
            orderBy: [{ type: "asc" }, { sort_order: "asc" }, { name: "asc" }],
          });

          // Group options by type
          const optionsByTypeMap = new Map<
            string,
            Array<{
              id: number;
              customize_category_id: number;
              category_name: string;
              type: string;
              name: string;
              value: string;
              price_modifier: number;
              sort_order: number;
              is_active: boolean;
              created_at: Date;
              updated_at: Date;
            }>
          >();

          for (const option of options) {
            const existing = optionsByTypeMap.get(option.type) ?? [];
            existing.push({
              id: option.id,
              customize_category_id: option.customize_category_id,
              category_name: customizeCategory.category,
              type: option.type,
              name: option.name,
              value: option.value,
              price_modifier: option.price_modifier,
              sort_order: option.sort_order,
              is_active: option.is_active,
              created_at: option.created_at,
              updated_at: option.updated_at,
            });
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
            customize_category_id,
            category_name: customizeCategory.category,
            options_by_type: optionsByType,
            total_options: options.length,
          };
        });
      },
    );
  }

  // Get all unique customization types
  @Query(() => [String])
  async customizationTypes(): Promise<string[]> {
    return customizationCache.getTypesList();
  }
}
