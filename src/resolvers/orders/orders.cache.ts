import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class OrderCache extends BaseCache {
  protected readonly pattern = "order:*";
  protected readonly domain = "Order";

  // Get user orders with pagination
  async getOrdersList(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const cacheKey = `query:order:list:${userId}:${page}:${limit}:${search ?? ""}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const where: {
          user_id: number;
          ordered_products?: {
            some: {
              product: { name: { contains: string; mode: "insensitive" } };
            };
          };
        } = { user_id: userId };
        if (search) {
          where.ordered_products = {
            some: {
              product: { name: { contains: search, mode: "insensitive" } },
            },
          };
        }

        const [orders, total] = await Promise.all([
          prisma.productOrder.findMany({
            where,
            include: {
              user: { select: { id: true, email: true, name: true } },
              ordered_products: {
                include: {
                  product: {
                    include: { reviews: { select: { rating: true } } },
                  },
                },
              },
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.productOrder.count({ where }),
        ]);

        return { orders, total };
      },
      CACHE_TTL.USER_DATA,
    );
  }

  // Get order by ID
  async getOrderById(userId: number, orderId: string) {
    return this.getOrSet(
      `query:order:id:${userId}:${orderId}`,
      async () => {
        return prisma.productOrder.findFirst({
          where: { id: orderId, user_id: userId },
          include: {
            user: { select: { id: true, email: true, name: true } },
            ordered_products: {
              include: {
                product: { include: { reviews: { select: { rating: true } } } },
              },
              orderBy: { product: { available_quantity: "desc" } },
            },
          },
        });
      },
      CACHE_TTL.USER_DATA,
    );
  }

  async invalidateOrdersList(userId: number): Promise<void> {
    await this.invalidatePattern(`query:order:list:${userId}:*`);
  }

  async invalidateOrderById(userId: number, orderId: string): Promise<void> {
    await this.delete(`query:order:id:${userId}:${orderId}`);
  }

  // Invalidate all orders for a user
  async invalidateUserOrders(userId: number): Promise<void> {
    await this.invalidateOrdersList(userId);
  }
}

export const orderCache = new OrderCache();
