import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class EventCache extends BaseCache {
  protected readonly pattern = "event:*";
  protected readonly domain = "Event";

  private keys = {
    bySlug: (slug: string) => `event:slug:${slug}`,
    byId: (id: string) => `event:id:${id}`,
    list: (filter: Record<string, unknown>) =>
      `event:list:${this.hashFilter(filter)}`,
  };

  // Legacy factory methods (still used by events list query)
  bySlug<T>(slug: string, factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.bySlug(slug), factory, CACHE_TTL.DETAIL);
  }

  byId<T>(id: string, factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.byId(id), factory, CACHE_TTL.DETAIL);
  }

  list<T>(
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(this.keys.list(filter), factory, CACHE_TTL.LIST);
  }

  async invalidateByEvent(eventId: string): Promise<void> {
    await this.invalidatePattern(`event:id:${eventId}`);
    await this.invalidatePattern(`event:slug:*`);
  }

  // Get event by slug with reviews
  async getEventBySlug(slug: string) {
    return this.getOrSet(
      `query:event:slug:${slug}`,
      async () => {
        return prisma.event.findUnique({
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
            _count: { select: { reviews: true, event_registrations: true } },
          },
        });
      },
      CACHE_TTL.DETAIL,
    );
  }

  // Get event by ID with reviews
  async getEventById(id: string) {
    return this.getOrSet(
      `query:event:id:${id}`,
      async () => {
        return prisma.event.findUnique({
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
            _count: { select: { reviews: true, event_registrations: true } },
          },
        });
      },
      CACHE_TTL.DETAIL,
    );
  }

  async invalidateEventById(id: string): Promise<void> {
    await this.delete(`query:event:id:${id}`);
  }

  async invalidateEventBySlug(slug: string): Promise<void> {
    await this.delete(`query:event:slug:${slug}`);
  }

  async invalidateEventLists(): Promise<void> {
    await this.invalidatePattern(`query:event:list:*`);
  }
}

export const eventCache = new EventCache();
