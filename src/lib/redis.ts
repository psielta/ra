import Redis from "ioredis";

import { createRequestLogger } from "@/lib/logger";

const redisLogger = createRequestLogger({ module: "redis" });

const globalForRedis = globalThis as unknown as {
  redisPublisher: Redis | null | undefined;
  redisDisabledLogged?: boolean;
};

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();

  if (!url) {
    if (!globalForRedis.redisDisabledLogged) {
      globalForRedis.redisDisabledLogged = true;
      redisLogger.warn({
        event: "redis.disabled",
        reason: "REDIS_URL not set — using in-memory notification bus",
      });
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on("error", (error) => {
    redisLogger.error({
      event: "redis.error",
      error: error.message,
    });
  });

  return client;
}

export function getRedisPublisher(): Redis | null {
  if (globalForRedis.redisPublisher === undefined) {
    globalForRedis.redisPublisher = createRedisClient();
  }

  return globalForRedis.redisPublisher;
}

export function notificationChannel(userId: string) {
  return `ra:notifications:${userId}`;
}
