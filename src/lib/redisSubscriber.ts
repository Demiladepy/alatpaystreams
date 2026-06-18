import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

/** Dedicated connection — Redis pub/sub requires a separate client from the publisher. */
export function createRedisSubscriber(): Redis {
  return new Redis(redisUrl);
}
