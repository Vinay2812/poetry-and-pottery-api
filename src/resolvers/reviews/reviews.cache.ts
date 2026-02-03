import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class ReviewCache extends BaseCache {
  protected readonly pattern = "review:*";
  protected readonly domain = "Review";

  private keys = {
    featured: (limit: number) => `review:featured:${limit}`,
    productReviews: (productId: number, filter: Record<string, unknown>) =>
      `review:product:${productId}:${this.hashFilter(filter)}`,
    eventReviews: (eventId: string, filter: Record<string, unknown>) =>
      `review:event:${eventId}:${this.hashFilter(filter)}`,
  };

  productReviews<T>(
    productId: number,
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.productReviews(productId, filter),
      factory,
      CACHE_TTL.LIST,
    );
  }

  eventReviews<T>(
    eventId: string,
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.eventReviews(eventId, filter),
      factory,
      CACHE_TTL.LIST,
    );
  }

  async invalidateProductReviews(productId: number): Promise<void> {
    await this.invalidatePattern(`review:product:${productId}:*`);
    await this.invalidatePattern(`review:featured:*`);
  }

  async invalidateEventReviews(eventId: string): Promise<void> {
    await this.invalidatePattern(`review:event:${eventId}:*`);
  }

  async invalidateFeatured(): Promise<void> {
    await this.invalidatePattern(`review:featured:*`);
  }

  // Get product reviews with pagination
  async getProductReviewsList(productId: number, page: number, limit: number) {
    const cacheKey = `query:review:product:${productId}:${page}:${limit}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const [reviews, total] = await Promise.all([
          prisma.review.findMany({
            where: { product_id: productId },
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
              likes: true,
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.review.count({ where: { product_id: productId } }),
        ]);
        return { reviews, total };
      },
      CACHE_TTL.LIST,
    );
  }

  // Get event reviews with pagination
  async getEventReviewsList(eventId: string, page: number, limit: number) {
    const cacheKey = `query:review:event:${eventId}:${page}:${limit}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const [reviews, total] = await Promise.all([
          prisma.review.findMany({
            where: { event_id: eventId },
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
              likes: true,
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.review.count({ where: { event_id: eventId } }),
        ]);
        return { reviews, total };
      },
      CACHE_TTL.LIST,
    );
  }

  // Get featured reviews
  async getFeaturedReviewsList(limit: number) {
    return this.getOrSet(
      `query:review:featured:${limit}`,
      async () => {
        return prisma.review.findMany({
          where: {
            rating: { gte: 4 },
            review: { not: null },
          },
          include: {
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
            likes: true,
            product: {
              select: { id: true, slug: true, name: true, image_urls: true },
            },
          },
          orderBy: { created_at: "desc" },
          take: limit,
        });
      },
      CACHE_TTL.STATIC,
    );
  }

  async invalidateProductReviewsList(productId: number): Promise<void> {
    await this.invalidatePattern(`query:review:product:${productId}:*`);
  }

  async invalidateEventReviewsList(eventId: string): Promise<void> {
    await this.invalidatePattern(`query:review:event:${eventId}:*`);
  }

  async invalidateFeaturedReviewsList(): Promise<void> {
    await this.invalidatePattern(`query:review:featured:*`);
  }
}

export const reviewCache = new ReviewCache();
