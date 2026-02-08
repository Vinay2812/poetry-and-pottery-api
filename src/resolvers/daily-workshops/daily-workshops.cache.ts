import { BaseCache, CACHE_TTL } from "@/lib/cache";

class DailyWorkshopCache extends BaseCache {
  protected readonly pattern = "daily-workshop:*";
  protected readonly domain = "DailyWorkshop";

  private keys = {
    config: () => "daily-workshop:config:default",
    publicConfigs: () => "daily-workshop:config:public",
    availability: (filter: Record<string, unknown>) =>
      `daily-workshop:availability:${this.hashFilter(filter)}`,
    userRegistrations: (
      userId: number,
      scope: string,
      page: number,
      limit: number,
      search?: string,
      status?: string,
    ) =>
      `daily-workshop:user:${userId}:${scope}:${page}:${limit}:${search ?? ""}:${status ?? ""}`,
    registrationDetail: (userId: number, registrationId: string) =>
      `daily-workshop:user:${userId}:registration:${registrationId}`,
    adminUserRegistrations: (userId: number) =>
      `daily-workshop:admin:user-registrations:${userId}`,
  };

  config<T>(factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(this.keys.config(), factory, CACHE_TTL.SEMI_STATIC);
  }

  publicConfigs<T>(factory: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      this.keys.publicConfigs(),
      factory,
      CACHE_TTL.SEMI_STATIC,
    );
  }

  availability<T>(
    filter: Record<string, unknown>,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.availability(filter),
      factory,
      CACHE_TTL.USER_DATA,
    );
  }

  userRegistrations<T>(
    userId: number,
    scope: string,
    page: number,
    limit: number,
    search: string | undefined,
    status: string | undefined,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.userRegistrations(userId, scope, page, limit, search, status),
      factory,
      CACHE_TTL.USER_DATA,
    );
  }

  registrationDetail<T>(
    userId: number,
    registrationId: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.registrationDetail(userId, registrationId),
      factory,
      CACHE_TTL.USER_DATA,
    );
  }

  adminUserRegistrations<T>(
    userId: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.adminUserRegistrations(userId),
      factory,
      CACHE_TTL.USER_DATA,
    );
  }

  async invalidateUserRegistrations(userId: number): Promise<void> {
    await this.invalidatePattern(`daily-workshop:user:${userId}:*`);
    await this.invalidatePattern(
      `daily-workshop:admin:user-registrations:${userId}`,
    );
  }
}

export const dailyWorkshopCache = new DailyWorkshopCache();
