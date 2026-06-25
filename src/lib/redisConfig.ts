import Redis, { type RedisOptions } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

const LOCAL_REDIS = 'redis://localhost:6379';

/**
 * Normalize REDIS_URL — handles common Upstash copy-paste mistakes
 * (e.g. pasting the full `redis-cli --tls -u rediss://...` command).
 */
export function normalizeRedisUrl(raw: string | undefined): string {
  if (!raw?.trim()) {
    return LOCAL_REDIS;
  }

  let value = raw.trim();

  const embedded = value.match(/rediss?:\/\/[^\s'"]+/i);
  if (embedded) {
    value = embedded[0];
  }

  if (value.includes('upstash.io') && value.startsWith('redis://')) {
    value = value.replace(/^redis:\/\//, 'rediss://');
  }

  return value;
}

export function getRedisUrl(): string {
  return normalizeRedisUrl(process.env.REDIS_URL);
}

function usesTls(url: string): boolean {
  return url.startsWith('rediss://');
}

export function getRedisClientOptions(): RedisOptions {
  const url = getRedisUrl();
  return {
    maxRetriesPerRequest: null,
    ...(usesTls(url) ? { tls: {} } : {}),
  };
}

/** ioredis client — pub/sub, cache, rate limits. */
export function createRedisClient(): Redis {
  return new Redis(getRedisUrl(), getRedisClientOptions());
}

/** BullMQ connection — WhatsApp + payout workers. */
export function getBullMqConnection(): ConnectionOptions {
  const url = new URL(getRedisUrl());
  const connection: ConnectionOptions = {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    username: url.username && url.username !== 'default' ? url.username : undefined,
    maxRetriesPerRequest: null,
  };
  if (url.protocol === 'rediss:') {
    connection.tls = {};
  }
  return connection;
}

export function validateRedisUrl(raw: string | undefined): URL | null {
  try {
    return new URL(normalizeRedisUrl(raw));
  } catch {
    return null;
  }
}
