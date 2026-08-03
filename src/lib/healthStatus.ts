import { execSync } from 'child_process';
import { prisma } from './db';
import { redis } from './redis';
import { getALATPayHealth } from '../integrations/alatpay';
import { isYarnGptConfigured } from '../integrations/yarngpt/client';

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** Reject after `ms` so a hung dependency can't stall the whole health check.
 *  A deleted/unreachable Postgres makes Prisma connections hang indefinitely —
 *  without this cap, /health never responds and the API looks fully dead. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function buildHealthStatus() {
  const alatpayHealth = getALATPayHealth();

  let postgres: 'connected' | 'disconnected' = 'disconnected';
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'postgres');
    postgres = 'connected';
  } catch {
    postgres = 'disconnected';
  }

  let redisStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    const pong = await withTimeout(redis.ping(), 5000, 'redis');
    redisStatus = pong === 'PONG' ? 'connected' : 'disconnected';
  } catch {
    redisStatus = 'disconnected';
  }

  return {
    status: postgres === 'connected' ? 'ok' : 'degraded',
    alatpayMode: alatpayHealth.mode,
    alatpayCircuit: alatpayHealth.circuitOpen ? ('open' as const) : ('closed' as const),
    redis: redisStatus,
    postgres,
    anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
    whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'missing',
    yarngpt: isYarnGptConfigured() ? 'configured' : 'missing',
    voiceProvider: process.env.VOICE_PROVIDER ?? 'yarngpt',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    version: gitSha(),
  };
}
