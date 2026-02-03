import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class ProductCache extends BaseCache {
  protected readonly pattern = "product:*";
  protected readonly domain = "Product";

  private keys = {
    categories: () => "product:categories",
    collections: (page: number, limit: number) =>
      `product:collections:${page}:${limit}`,
    list: (filter: Record<string, unknown>) =>
      `product:list:${this.hashFilter(filter)}`,
    byId: (id: number) => `product:id:${id}`,
  };

  // Get product by ID with reviews and collection
  async getProductById(id: number) {
    return this.getOrSet(
      `query:product:id:${id}`,
      async () => {
        return prisma.product.findUnique({
          where: { id },
          include: {
            reviews: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, image: true },
                },
                likes: true,
              },
              orderBy: { created_at: "desc" },
              take: 10,
            },
            collection: {
              include: { _count: { select: { products: true } } },
            },
            _count: { select: { reviews: true } },
          },
        });
      },
      CACHE_TTL.DETAIL,
    );
  }

  // Get list of all unique categories
  async getCategoriesList(): Promise<string[]> {
    return this.getOrSet(
      `query:product:categories`,
      async () => {
        const categories = await prisma.productCategory.findMany({
          where: { product: { is_active: true } },
          distinct: ["category"],
          select: { category: true },
        });
        return categories.map((c) => c.category).filter(Boolean) as string[];
      },
      CACHE_TTL.STATIC,
    );
  }

  async invalidateProductById(id: number): Promise<void> {
    await this.delete(`query:product:id:${id}`);
  }

  async invalidateProductLists(): Promise<void> {
    await this.invalidatePattern(`query:product:list:*`);
  }

  async invalidateCategories(): Promise<void> {
    await this.delete(`query:product:categories`);
  }

  // Legacy factory methods (still used by products resolver)
  categories(factory: () => Promise<string[]>): Promise<string[]> {
    return this.getOrSet(this.keys.categories(), factory, CACHE_TTL.STATIC);
  }

  collections<T>(
    page: number,
    limit: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.collections(page, limit),
      factory,
      CACHE_TTL.STATIC,
    );
  }

  list<T>(
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(this.keys.list(filter), factory, CACHE_TTL.LIST);
  }

  byId<T>(id: number, factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.byId(id), factory, CACHE_TTL.DETAIL);
  }

  async invalidateByProduct(productId: number): Promise<void> {
    await this.invalidatePattern(`product:id:${productId}`);
  }
}

export const productCache = new ProductCache();
