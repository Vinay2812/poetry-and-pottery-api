import Redis from "ioredis";

import { REDIS_HOST, REDIS_PORT, REDIS_URL } from "@/consts/env";
import { logger } from "@/lib/logger";

class RedisClient {
  private client: Redis | null = null;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (process.env["NODE_ENV"] === "test") return;

    try {
      if (REDIS_URL) {
        this.client = new Redis(REDIS_URL, this.getOptions());
      } else if (REDIS_HOST && REDIS_PORT) {
        this.client = new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          ...this.getOptions(),
        });
      } else {
        logger.info("Redis not configured - caching disabled");
        return;
      }

      this.setupEventHandlers();
      this.client
        .connect()
        .catch((err) => logger.error("Failed to connect to Redis:", err));
    } catch (error) {
      logger.error("Failed to create Redis client:", error);
    }
  }

  private getOptions() {
    return {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn(
            "Redis connection failed after 3 retries, disabling cache",
          );
          return null;
        }
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
    };
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on("connect", () =>
      logger.info("Redis connected successfully"),
    );
    this.client.on("error", (err) =>
      logger.error("Redis connection error:", err),
    );
    this.client.on("close", () => logger.info("Redis connection closed"));
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.client !== null && this.client.status === "ready";
  }

  async close(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}

const redisClient = new RedisClient();

export const redis = redisClient.getClient();
export const isRedisReady = () => redisClient.isReady();
export const closeRedis = () => redisClient.close();
