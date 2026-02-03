import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class ProductCache extends BaseCache {
  protected readonly pattern = "product:*";
  protected readonly domain = "Product";

  private keys = {
    categories: () => "product:categories",
    categoriesWithImages: () => "product:categories:images",
    materials: () => "product:materials",
    collections: (page: number, limit: number) =>
      `product:collections:${page}:${limit}`,
    bestSellers: (page: number, limit: number) =>
      `product:bestsellers:${page}:${limit}`,
    list: (filter: Record<string, unknown>) =>
      `product:list:${this.hashFilter(filter)}`,
    bySlug: (slug: string) => `product:slug:${slug}`,
    byId: (id: number) => `product:id:${id}`,
  };

  // Get product by slug with reviews and collection
  async getProductBySlug(slug: string) {
    return this.getOrSet(
      `query:product:slug:${slug}`,
      async () => {
        return prisma.product.findUnique({
          where: { slug },
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

  // Get list of all unique materials
  async getMaterialsList(): Promise<string[]> {
    return this.getOrSet(
      `query:product:materials`,
      async () => {
        const materials = await prisma.product.findMany({
          where: { is_active: true },
          distinct: ["material"],
          select: { material: true },
        });
        return materials.map((m) => m.material).filter(Boolean) as string[];
      },
      CACHE_TTL.STATIC,
    );
  }

  async invalidateProductById(id: number): Promise<void> {
    await this.delete(`query:product:id:${id}`);
  }

  async invalidateProductBySlug(slug: string): Promise<void> {
    await this.delete(`query:product:slug:${slug}`);
  }

  async invalidateProductLists(): Promise<void> {
    await this.invalidatePattern(`query:product:list:*`);
  }

  async invalidateCategoriesAndMaterials(): Promise<void> {
    await this.delete(`query:product:categories`);
    await this.delete(`query:product:materials`);
  }

  // Legacy factory methods (still used by products resolver)
  categories(factory: () => Promise<string[]>): Promise<string[]> {
    return this.getOrSet(this.keys.categories(), factory, CACHE_TTL.STATIC);
  }

  categoriesWithImages<T>(factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      this.keys.categoriesWithImages(),
      factory,
      CACHE_TTL.STATIC,
    );
  }

  materials(factory: () => Promise<string[]>): Promise<string[]> {
    return this.getOrSet(this.keys.materials(), factory, CACHE_TTL.STATIC);
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

  bestSellers<T>(
    page: number,
    limit: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.bestSellers(page, limit),
      factory,
      CACHE_TTL.FEATURED,
    );
  }

  list<T>(
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(this.keys.list(filter), factory, CACHE_TTL.LIST);
  }

  bySlug<T>(slug: string, factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.bySlug(slug), factory, CACHE_TTL.DETAIL);
  }

  byId<T>(id: number, factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.byId(id), factory, CACHE_TTL.DETAIL);
  }

  async invalidateByProduct(productId: number): Promise<void> {
    await this.invalidatePattern(`product:id:${productId}`);
    await this.invalidatePattern(`product:slug:*`);
  }
}

export const productCache = new ProductCache();
