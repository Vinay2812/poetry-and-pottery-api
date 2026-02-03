import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class CustomizationCache extends BaseCache {
  protected readonly pattern = "customization:*";
  protected readonly domain = "Customization";

  private keys = {
    categories: (filter: Record<string, unknown>) =>
      `customization:categories:${this.hashFilter(filter)}`,
    optionsByCategory: (categoryId: number, type?: string) =>
      `customization:options:${categoryId}:${type ?? "all"}`,
  };

  // Get all customization category IDs
  async getCategoriesList() {
    return this.getOrSet(
      `query:customization:categories`,
      async () => {
        const categories = await prisma.customizeCategory.findMany({
          where: { is_active: true },
          select: { id: true, category: true },
          orderBy: { category: "asc" },
        });
        return categories;
      },
      CACHE_TTL.SEMI_STATIC,
    );
  }

  // Get customization options by category ID
  async getOptionsByCategoryId(categoryId: number, type?: string) {
    const cacheKey = `query:customization:options:${categoryId}:${type ?? "all"}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const where: { customize_category_id: number; type?: string } = {
          customize_category_id: categoryId,
        };
        if (type) {
          where.type = type;
        }
        return prisma.customizationOption.findMany({
          where,
          include: {
            customize_category: {
              select: { category: true },
            },
          },
          orderBy: { name: "asc" },
        });
      },
      CACHE_TTL.SEMI_STATIC,
    );
  }

  // Get all customization types
  async getTypesList(): Promise<string[]> {
    return this.getOrSet(
      `query:customization:types`,
      async () => {
        const types = await prisma.customizationOption.findMany({
          distinct: ["type"],
          select: { type: true },
        });
        return types.map((t) => t.type).filter(Boolean) as string[];
      },
      CACHE_TTL.STATIC,
    );
  }

  async invalidateCategoriesList(): Promise<void> {
    await this.delete(`query:customization:categories`);
  }

  async invalidateOptionsByCategoryId(categoryId: number): Promise<void> {
    await this.invalidatePattern(`query:customization:options:${categoryId}:*`);
  }

  async invalidateTypesList(): Promise<void> {
    await this.delete(`query:customization:types`);
  }

  async invalidateAllQueryCache(): Promise<void> {
    await this.invalidatePattern(`query:customization:*`);
  }

  // Legacy factory methods (still used by customizationCategories query)
  categories<T>(
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.categories(filter),
      factory,
      CACHE_TTL.SEMI_STATIC,
    );
  }

  optionsByCategory<T>(
    categoryId: number,
    type: string | undefined,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.optionsByCategory(categoryId, type),
      factory,
      CACHE_TTL.SEMI_STATIC,
    );
  }
}

export const customizationCache = new CustomizationCache();
