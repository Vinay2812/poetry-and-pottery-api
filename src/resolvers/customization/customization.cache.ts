import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class CustomizationCache extends BaseCache {
  protected readonly pattern = "customization:*";
  protected readonly domain = "Customization";

  private keys = {
    categories: (filter: Record<string, unknown>) =>
      `customization:categories:${this.hashFilter(filter)}`,
    optionsByCategory: (category: string, type?: string) =>
      `customization:options:${category}:${type ?? "all"}`,
  };

  // Get all customization categories
  async getCategoriesList() {
    return this.getOrSet(
      `query:customization:categories`,
      async () => {
        const categories = await prisma.customizationOption.groupBy({
          by: ["category"],
          orderBy: { category: "asc" },
        });
        return categories.map((c) => c.category);
      },
      CACHE_TTL.SEMI_STATIC,
    );
  }

  // Get customization options by category
  async getOptionsByCategory(category: string, type?: string) {
    const cacheKey = `query:customization:options:${category}:${type ?? "all"}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const where: { category: string; type?: string } = { category };
        if (type) {
          where.type = type;
        }
        return prisma.customizationOption.findMany({
          where,
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

  async invalidateOptionsByCategory(category: string): Promise<void> {
    await this.invalidatePattern(`query:customization:options:${category}:*`);
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
    category: string,
    type: string | undefined,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.optionsByCategory(category, type),
      factory,
      CACHE_TTL.SEMI_STATIC,
    );
  }
}

export const customizationCache = new CustomizationCache();
