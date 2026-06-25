import type Redis from 'ioredis';
import { createRedisClient } from './redisConfig';

let client: Redis | null = null;

function getRedisClient(): Redis {
  if (!client) {
    client = createRedisClient();
  }
  return client;
}

/** Lazy Redis client — connects after env validation, not at import time. */
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const instance = getRedisClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export function publishTxEvent(
  merchantId: string,
  payload: Record<string, unknown>,
): Promise<number> {
  return getRedisClient().publish(`tx:${merchantId}`, JSON.stringify(payload));
}
