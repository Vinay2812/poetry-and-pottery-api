import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class NewsletterCache extends BaseCache {
  protected readonly pattern = "newsletter:*";
  protected readonly domain = "Newsletter";

  // Get user's newsletter subscription status
  async getUserStatus(userId: number) {
    return this.getOrSet(
      `query:newsletter:status:${userId}`,
      async () => {
        return prisma.user.findUnique({
          where: { id: userId },
          select: {
            subscribed_to_newsletter: true,
            newsletter_subscribed_at: true,
          },
        });
      },
      CACHE_TTL.USER_DATA,
    );
  }

  async invalidateUserStatus(userId: number): Promise<void> {
    await this.delete(`query:newsletter:status:${userId}`);
  }
}

export const newsletterCache = new NewsletterCache();
