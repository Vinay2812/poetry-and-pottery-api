import { BaseCache, CACHE_TTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

class RegistrationCache extends BaseCache {
  protected readonly pattern = "registration:*";
  protected readonly domain = "Registration";

  // Get user registrations with pagination
  async getUserRegistrationsList(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const cacheKey = `query:registration:list:${userId}:${page}:${limit}:${search ?? ""}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const where: {
          user_id: number;
          event?: { title: { contains: string; mode: "insensitive" } };
        } = { user_id: userId };
        if (search) {
          where.event = { title: { contains: search, mode: "insensitive" } };
        }

        const [registrations, total] = await Promise.all([
          prisma.eventRegistration.findMany({
            where,
            include: {
              event: true,
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
            },
            orderBy: { created_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.eventRegistration.count({ where }),
        ]);

        return { registrations, total };
      },
      CACHE_TTL.USER_DATA,
    );
  }

  // Get upcoming registrations
  async getUpcomingRegistrationsList(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const cacheKey = `query:registration:upcoming:${userId}:${page}:${limit}:${search ?? ""}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const baseWhere = {
          user_id: userId,
          event: { ends_at: { gt: now } },
        };

        const where = search
          ? {
              ...baseWhere,
              AND: [
                {
                  event: {
                    title: { contains: search, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : baseWhere;

        const [registrations, total] = await Promise.all([
          prisma.eventRegistration.findMany({
            where,
            include: {
              event: true,
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
            },
            orderBy: { event: { starts_at: "asc" } },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.eventRegistration.count({ where }),
        ]);

        return { registrations, total };
      },
      CACHE_TTL.USER_DATA,
    );
  }

  // Get completed registrations
  async getCompletedRegistrationsList(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const cacheKey = `query:registration:completed:${userId}:${page}:${limit}:${search ?? ""}`;
    return this.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const baseWhere = {
          user_id: userId,
          event: { ends_at: { lte: now } },
        };

        const where = search
          ? {
              ...baseWhere,
              AND: [
                {
                  event: {
                    title: { contains: search, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : baseWhere;

        const [registrations, total] = await Promise.all([
          prisma.eventRegistration.findMany({
            where,
            include: {
              event: true,
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
            },
            orderBy: { event: { ends_at: "desc" } },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.eventRegistration.count({ where }),
        ]);

        return { registrations, total };
      },
      CACHE_TTL.USER_DATA,
    );
  }

  // Get registration by ID
  async getRegistrationById(userId: number, registrationId: string) {
    return this.getOrSet(
      `query:registration:id:${userId}:${registrationId}`,
      async () => {
        return prisma.eventRegistration.findFirst({
          where: { id: registrationId, user_id: userId },
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
        });
      },
      CACHE_TTL.USER_DATA,
    );
  }

  async invalidateUserRegistrationsList(userId: number): Promise<void> {
    await this.invalidatePattern(`query:registration:*:${userId}:*`);
  }

  // Invalidate all registrations for a user
  async invalidateUserRegistrations(userId: number): Promise<void> {
    await this.invalidateUserRegistrationsList(userId);
  }
}

export const registrationCache = new RegistrationCache();
