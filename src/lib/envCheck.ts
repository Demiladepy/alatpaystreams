import { logger } from './logger';
import { normalizeRedisUrl, validateRedisUrl } from './redisConfig';

interface EnvCheckResult {
  ok: boolean;
  warnings: string[];
}

export function validateEnv(): EnvCheckResult {
  const warnings: string[] = [];
  const useMock = process.env.ALATPAY_USE_MOCK === 'true';

  const required = ['DATABASE_URL', 'REDIS_URL', 'ANTHROPIC_API_KEY'];

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      logger.error(`Missing critical env var ${key}. Refusing to start.`);
      return { ok: false, warnings };
    }
  }

  if (!useMock) {
    const secret =
      process.env.ALATPAY_SECRET_KEY?.trim() || process.env.ALATPAY_API_KEY?.trim();
    if (!secret) {
      logger.error(
        'Missing ALATPAY_SECRET_KEY (or ALATPAY_API_KEY). Required when ALATPAY_USE_MOCK=false.',
      );
      return { ok: false, warnings };
    }
    if (!process.env.ALATPAY_BUSINESS_ID?.trim() && !process.env.ALATPAY_MERCHANT_ID?.trim()) {
      warnings.push(
        'ALATPAY_BUSINESS_ID not set — payment-link and virtual-account routes need business_id in the request body',
      );
    }
  }

  const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);
  if (
    process.env.NODE_ENV === 'production' &&
    (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))
  ) {
    logger.error(
      'REDIS_URL points to localhost. Render has no local Redis — set an Upstash rediss:// URL in the Render dashboard Environment tab, then redeploy.',
    );
    return { ok: false, warnings };
  }

  const parsedRedis = validateRedisUrl(process.env.REDIS_URL);
  if (!parsedRedis) {
    logger.error(
      'REDIS_URL is invalid. Paste only the URL from Upstash (rediss://default:TOKEN@host:6379) — not the redis-cli command.',
    );
    return { ok: false, warnings };
  }

  if (process.env.REDIS_URL?.includes('redis-cli')) {
    warnings.push('REDIS_URL contained a redis-cli command — using extracted URL; fix the env var on Render');
    logger.warn(
      { redisHost: parsedRedis.hostname },
      'REDIS_URL looked like a redis-cli command — extracted URL only. Update Render to paste the URL alone.',
    );
  } else {
    logger.info(
      { redisHost: parsedRedis.hostname, tls: parsedRedis.protocol === 'rediss:' },
      'Redis configured',
    );
  }

  const voiceProvider = (process.env.VOICE_PROVIDER ?? 'yarngpt').toLowerCase();
  if (voiceProvider === 'yarngpt' && !process.env.YARNGPT_API_KEY?.trim()) {
    if (process.env.VOICE_WHISPER_FALLBACK === 'true' && process.env.OPENAI_API_KEY?.trim()) {
      warnings.push('YARNGPT_API_KEY missing — voice will use Whisper fallback only');
      logger.warn('YARNGPT_API_KEY not set — using Whisper fallback for Streams Voice');
    } else {
      warnings.push('YARNGPT_API_KEY not set — Streams Voice disabled until configured');
      logger.warn('YARNGPT_API_KEY not set — add key from yarngpt.ai/account for Streams Voice');
    }
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN?.trim()) {
    warnings.push('WHATSAPP_ACCESS_TOKEN not set — WhatsApp integration disabled');
    logger.warn('WHATSAPP_ACCESS_TOKEN not set — WhatsApp is optional');
  }

  return { ok: true, warnings };
}

export function logAlatpayModeBanner(): void {
  const mock = process.env.ALATPAY_USE_MOCK === 'true';
  const line = '==============================================';
  if (mock) {
    logger.warn(`${line}\nALATPAY MODE: MOCK   (DO NOT DEMO)\n${line}`);
  } else {
    logger.info(`${line}\nALATPAY MODE: PRODUCTION\n${line}`);
  }
}
