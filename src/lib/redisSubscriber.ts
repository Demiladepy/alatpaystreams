import { createRedisClient } from './redisConfig';

/** Dedicated connection — Redis pub/sub requires a separate client from the publisher. */
export function createRedisSubscriber() {
  return createRedisClient();
}
