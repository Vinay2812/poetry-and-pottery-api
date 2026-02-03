import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class CartCache extends BaseCache {
  protected readonly pattern = "cart:*";
  protected readonly domain = "Cart";

  private keys = {
    items: (userId: number) => `query:cart:items:${userId}`,
  };

  // Get cart items with product details
  async getCartItems(userId: number) {
    return this.getOrSet(
      this.keys.items(userId),
      async () => {
        return prisma.cart.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            user_id: true,
            product_id: true,
            quantity: true,
            custom_data: true,
            custom_data_hash: true,
            created_at: true,
            updated_at: true,
            product: {
              include: {
                reviews: { select: { rating: true } },
                collection: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        });
      },
      CACHE_TTL.USER_VOLATILE,
    );
  }

  async invalidateCartItems(userId: number): Promise<void> {
    await this.delete(this.keys.items(userId));
  }

  // Invalidate all cart data for a user
  async invalidateUserCart(userId: number): Promise<void> {
    await this.invalidateCartItems(userId);
  }
}

export const cartCache = new CartCache();
