import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

export function publishTxEvent(
  merchantId: string,
  payload: Record<string, unknown>,
): Promise<number> {
  return redis.publish(`tx:${merchantId}`, JSON.stringify(payload));
}
