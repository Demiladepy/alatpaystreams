import Decimal from 'decimal.js';
import { logger } from '../../lib/logger';
import { ALATPayHttpClient } from './client';
import { cachePayout, getCachedPayout } from './redisStore';
import { CircuitBreaker } from './retry';
import {
  extractEmbeddedSignature,
  verifyWebhookSignature as verifySignature,
} from './signatureVerify';
import {
  ALATPayCircuitOpenError,
  ALATPayClientError,
  type ALATPayHealth,
  type ALATPayService,
  type AccountInfo,
  type AccountStatus,
  type MockWebhookPayload,
  type ParsedWebhook,
  type PaymentChannel,
  type PayoutInput,
  type PayoutResult,
  type PayoutStatus,
  type RawPayoutResponse,
} from './types';

const TIMEOUT_MS = 6000;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 60_000;

let lastSuccessfulCallAt: Date | null = null;

function useMockMode(): boolean {
  return process.env.ALATPAY_USE_MOCK === 'true';
}

function resolveBaseUrl(): string {
  if (useMockMode()) {
    return process.env.ALATPAY_BASE_URL ?? 'http://localhost:5500';
  }
  return process.env.ALATPAY_BASE_URL ?? '';
}

function normalizePayoutStatus(raw: string): PayoutStatus {
  if (raw === 'successful' || raw === 'pending' || raw === 'failed') {
    return raw;
  }
  return 'failed';
}

function normalizeAccountStatus(raw: string): AccountStatus {
  if (raw === 'active' || raw === 'frozen' || raw === 'closed') {
    return raw;
  }
  if (raw === 'suspended') {
    return 'frozen';
  }
  return 'active';
}

function normalizeChannel(raw: string): PaymentChannel {
  if (raw === 'card' || raw === 'transfer' || raw === 'ussd') {
    return raw;
  }
  return 'unknown';
}

function mapPayoutResponse(raw: RawPayoutResponse): PayoutResult {
  const status = normalizePayoutStatus(raw.status);

  if (status === 'failed') {
    return {
      status: 'failed',
      transactionId: raw.transactionId ?? `FAILED-${Date.now()}`,
      timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
      failureReason: raw.failureReason ?? raw.message ?? 'Payout failed',
    };
  }

  return {
    status,
    transactionId: raw.transactionId,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    balanceAfter:
      raw.balanceAfter !== undefined ? new Decimal(raw.balanceAfter) : undefined,
  };
}

function createClient(): ALATPayHttpClient {
  return new ALATPayHttpClient({
    baseUrl: resolveBaseUrl(),
    apiKey: process.env.ALATPAY_API_KEY,
    timeoutMs: TIMEOUT_MS,
    useMock: useMockMode(),
  });
}

const payoutCircuit = new CircuitBreaker(CIRCUIT_THRESHOLD, CIRCUIT_OPEN_MS);
let httpClient: ALATPayHttpClient | null = null;

function getHttpClient(): ALATPayHttpClient {
  if (!httpClient) {
    httpClient = createClient();
  }
  return httpClient;
}

export const alatpayService: ALATPayService = {
  async payout(input: PayoutInput): Promise<PayoutResult> {
    if (payoutCircuit.isOpen()) {
      throw new ALATPayCircuitOpenError();
    }

    const cached = await getCachedPayout(input.reference);
    if (cached) {
      logger.info({ reference: input.reference }, 'ALATPay payout idempotency cache hit');
      return cached;
    }

    try {
      const raw = await getHttpClient().postPayout({
        merchantAccountId: input.merchantAccountId,
        amountNaira: input.amountNaira.toNumber(),
        narration: input.narration,
        reference: input.reference,
      });

      const result = mapPayoutResponse(raw);

      if (result.status === 'failed') {
        payoutCircuit.recordFailure();
        await cachePayout(input.reference, result);
        return result;
      }

      payoutCircuit.recordSuccess();
      lastSuccessfulCallAt = new Date();
      await cachePayout(input.reference, result);
      return result;
    } catch (error) {
      payoutCircuit.recordFailure();

      if (error instanceof ALATPayClientError && error.statusCode === 504) {
        const recovered = await getCachedPayout(input.reference);
        if (recovered) {
          logger.warn(
            { reference: input.reference },
            'Recovered payout status from idempotency cache after 504',
          );
          return recovered;
        }
      }

      throw error;
    }
  },

  async getAccount(merchantAccountId: string): Promise<AccountInfo> {
    const raw = await getHttpClient().getAccount(merchantAccountId);
    lastSuccessfulCallAt = new Date();

    return {
      accountId: raw.accountId,
      accountName: raw.accountName,
      balanceNaira: new Decimal(raw.balanceNaira),
      status: normalizeAccountStatus(raw.status),
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const effectiveSignature = signature || extractEmbeddedSignature(rawBody);
    return verifySignature(rawBody, effectiveSignature);
  },

  parseWebhook(payload: unknown): ParsedWebhook {
    const body = payload as MockWebhookPayload;
    if (!body?.event || !body?.data?.transactionId) {
      throw new Error('Invalid ALATPay webhook payload');
    }

    return {
      eventType: body.event,
      transactionId: body.data.transactionId,
      merchantAccountId: body.data.merchantAccountId,
      amountNaira: new Decimal(body.data.amountNaira),
      customerName: body.data.customerName,
      customerPhone: body.data.customerPhone,
      channel: normalizeChannel(body.data.channel),
      reference: body.data.reference,
      receivedAt: body.timestamp ? new Date(body.timestamp) : new Date(),
    };
  },
};

export function getALATPayHealth(): ALATPayHealth {
  const circuit = payoutCircuit.getState();
  return {
    mode: useMockMode() ? 'mock' : 'production',
    circuitOpen: circuit.circuitOpen,
    circuitOpenUntil:
      circuit.circuitOpenUntil > Date.now()
        ? new Date(circuit.circuitOpenUntil).toISOString()
        : null,
    consecutiveFailures: circuit.consecutiveFailures,
    lastSuccessfulCallAt: lastSuccessfulCallAt?.toISOString() ?? null,
    baseUrl: resolveBaseUrl(),
  };
}

export function logALATPayStartupMode(): void {
  const health = getALATPayHealth();
  const banner = useMockMode()
    ? '>>> ALATPAY MODE: MOCK (local contract on :5500) <<<'
    : '>>> ALATPAY MODE: PRODUCTION <<<';

  logger.warn(
    {
      mode: health.mode,
      baseUrl: health.baseUrl,
      useMock: useMockMode(),
    },
    banner,
  );

  if (useMockMode()) {
    logger.warn('Demo day MUST set ALATPAY_USE_MOCK=false');
  }
}

/** Test-only reset */
export function resetALATPayStateForTests(): void {
  payoutCircuit.reset();
  lastSuccessfulCallAt = null;
  httpClient = null;
}
