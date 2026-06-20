import { execSync } from 'child_process';
import { prisma } from './db';
import { redis } from './redis';
import { getALATPayHealth } from '../integrations/alatpay';

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export async function buildHealthStatus() {
  const alatpayHealth = getALATPayHealth();

  let postgres: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = 'connected';
  } catch {
    postgres = 'disconnected';
  }

  let redisStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    const pong = await redis.ping();
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
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    version: gitSha(),
  };
}
