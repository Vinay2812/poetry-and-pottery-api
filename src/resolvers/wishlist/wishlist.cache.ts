import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class WishlistCache extends BaseCache {
  protected readonly pattern = "wishlist:*";
  protected readonly domain = "Wishlist";

  private keys = {
    ids: (userId: number) => `query:wishlist:ids:${userId}`,
    items: (userId: number, page: number, limit: number) =>
      `query:wishlist:items:${userId}:${page}:${limit}`,
  };

  // Invalidate all wishlist data for a user
  async invalidateUserWishlist(userId: number): Promise<void> {
    await this.invalidateWishlistIds(userId);
    await this.invalidateWishlistItems(userId);
  }

  // Get wishlist product IDs
  async getWishlistIds(userId: number): Promise<number[]> {
    return this.getOrSet(
      this.keys.ids(userId),
      async () => {
        const items = await prisma.wishlist.findMany({
          where: { user_id: userId },
          select: { product_id: true },
        });
        return items.map((item) => item.product_id);
      },
      CACHE_TTL.USER_VOLATILE,
    );
  }

  // Get wishlist items with pagination
  async getWishlistItems(userId: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return this.getOrSet(
      this.keys.items(userId, page, limit),
      async () => {
        const [items, total] = await Promise.all([
          prisma.wishlist.findMany({
            where: { user_id: userId },
            include: {
              product: {
                include: {
                  reviews: { select: { rating: true } },
                  collection: {
                    include: { _count: { select: { products: true } } },
                  },
                },
              },
            },
            orderBy: [
              { product: { available_quantity: "desc" } },
              { created_at: "desc" },
            ],
            skip: offset,
            take: limit,
          }),
          prisma.wishlist.count({ where: { user_id: userId } }),
        ]);
        return { items, total };
      },
      CACHE_TTL.USER_VOLATILE,
    );
  }

  async invalidateWishlistIds(userId: number): Promise<void> {
    await this.delete(this.keys.ids(userId));
  }

  async invalidateWishlistItems(userId: number): Promise<void> {
    await this.invalidatePattern(`query:wishlist:items:${userId}:*`);
  }
}

export const wishlistCache = new WishlistCache();
