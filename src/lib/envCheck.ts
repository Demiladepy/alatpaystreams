import { logger } from './logger';

interface EnvCheckResult {
  ok: boolean;
  warnings: string[];
}

export function validateEnv(): EnvCheckResult {
  const warnings: string[] = [];
  const useMock = process.env.ALATPAY_USE_MOCK === 'true';

  const required = ['DATABASE_URL', 'REDIS_URL', 'ANTHROPIC_API_KEY'];

  if (!useMock) {
    required.push('ALATPAY_API_KEY');
  }

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      logger.error(`Missing critical env var ${key}. Refusing to start.`);
      return { ok: false, warnings };
    }
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
