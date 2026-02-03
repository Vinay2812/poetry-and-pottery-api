import { logger } from "@/lib/logger";
import type { ExtendedPrismaClient } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// Abstract base class for domain-specific caches with graceful degradation
export abstract class BaseCache {
  // Pattern for cache invalidation (e.g., "product:*", "event:*")
  protected abstract readonly pattern: string;

  // Domain name for logging (e.g., "Product", "Event")
  protected abstract readonly domain: string;

  // Hash an object filter into a cache key suffix
  protected hashFilter(filter: Record<string, unknown>): string {
    const sorted = Object.keys(filter)
      .sort()
      .reduce(
        (acc, key) => {
          const value = filter[key];
          if (value !== undefined && value !== null) acc[key] = value;
          return acc;
        },
        {} as Record<string, unknown>,
      );
    return Buffer.from(JSON.stringify(sorted)).toString("base64url");
  }

  // Get from cache or compute and set, gracefully degrades if Redis unavailable
  protected async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    if (!redis) return factory();

    try {
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`[${this.domain}] Cache HIT: ${key}`);
        return JSON.parse(cached) as T;
      }

      logger.debug(`[${this.domain}] Cache MISS: ${key}`);
      const result = await factory();
      await redis.setex(key, ttl, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error(`[${this.domain}] Cache error for ${key}:`, error);
      return factory();
    }
  }

  // Delete a specific cache key
  protected async delete(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
      logger.debug(`[${this.domain}] Cache DELETE: ${key}`);
    } catch (error) {
      logger.error(`[${this.domain}] Cache delete error for ${key}:`, error);
    }
  }

  // Delete multiple cache keys
  protected async deleteMany(keys: string[]): Promise<void> {
    if (!redis || keys.length === 0) return;

    try {
      await redis.del(...keys);
      logger.debug(`[${this.domain}] Cache DELETE MANY: ${keys.length} keys`);
    } catch (error) {
      logger.error(`[${this.domain}] Cache delete many error:`, error);
    }
  }

  // Invalidate all caches matching this domain's pattern using SCAN
  async invalidateAll(): Promise<void> {
    if (!redis) return;

    try {
      let cursor = "0";
      let deletedCount = 0;

      do {
        const [nextCursor, foundKeys] = await redis.scan(
          cursor,
          "MATCH",
          this.pattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (foundKeys.length > 0) {
          await redis.del(...foundKeys);
          deletedCount += foundKeys.length;
        }
      } while (cursor !== "0");

      if (deletedCount > 0) {
        logger.info(`[${this.domain}] Cache invalidated: ${deletedCount} keys`);
      }
    } catch (error) {
      logger.error(`[${this.domain}] Cache invalidation error:`, error);
      throw error;
    }
  }

  // Invalidate caches matching a specific pattern
  async invalidatePattern(patternToInvalidate: string): Promise<void> {
    if (!redis) return;

    try {
      let cursor = "0";
      let deletedCount = 0;

      do {
        const [nextCursor, foundKeys] = await redis.scan(
          cursor,
          "MATCH",
          patternToInvalidate,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (foundKeys.length > 0) {
          await redis.del(...foundKeys);
          deletedCount += foundKeys.length;
        }
      } while (cursor !== "0");

      if (deletedCount > 0) {
        logger.debug(
          `[${this.domain}] Pattern invalidated (${patternToInvalidate}): ${deletedCount} keys`,
        );
      }
    } catch (error) {
      logger.error(`[${this.domain}] Pattern invalidation error:`, error);
    }
  }

  // Execute DB operation with cache invalidation in transaction
  async withTransaction<T>(
    prisma: ExtendedPrismaClient,
    operation: (tx: ExtendedPrismaClient) => Promise<T>,
  ): Promise<T> {
    const result = await prisma.$transaction(async (tx) => {
      const dbResult = await operation(tx as unknown as ExtendedPrismaClient);
      await this.invalidateAll();
      return dbResult;
    });
    return result;
  }
}
