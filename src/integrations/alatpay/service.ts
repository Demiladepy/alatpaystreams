import Decimal from 'decimal.js';
import { logger } from '../../lib/logger';
import { resolveOfficialBaseUrl, resolveSecretKey } from './config';
import { ALATPayHttpClient } from './client';
import { cachePayout, getCachedPayout } from './redisStore';
import { CircuitBreaker } from './retry';
import { recordPayoutAttempt } from '../../services/uptimeMonitor';
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
  return resolveOfficialBaseUrl();
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
  if (raw === 'card' || raw === 'transfer' || raw === 'ussd' || raw === 'tap_and_pay') {
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
    apiKey: resolveSecretKey(),
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
      const start = Date.now();
      const raw = await getHttpClient().postPayout({
        merchantAccountId: input.merchantAccountId,
        amountNaira: input.amountNaira.toNumber(),
        narration: input.narration,
        reference: input.reference,
      });

      const result = mapPayoutResponse(raw);
      const settlementMs = Date.now() - start;

      if (input.destinationBankCode) {
        await recordPayoutAttempt(
          input.destinationBankCode,
          result.status !== 'failed',
          settlementMs,
        );
      }

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
      bankCode: raw.bankCode,
      bankName: raw.bankName,
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const effectiveSignature = signature || extractEmbeddedSignature(rawBody);
    return verifySignature(rawBody, effectiveSignature);
  },

  parseWebhook(payload: unknown): ParsedWebhook {
    const body = payload as MockWebhookPayload;
    if (body?.event && body?.data?.transactionId) {
      return {
        eventType: normalizeWebhookEvent(body.event),
        transactionId: body.data.transactionId,
        merchantAccountId: body.data.merchantAccountId,
        amountNaira: new Decimal(body.data.amountNaira),
        customerName: body.data.customerName,
        customerPhone: body.data.customerPhone,
        channel: normalizeChannel(body.data.channel),
        reference: body.data.reference,
        receivedAt: body.timestamp ? new Date(body.timestamp) : new Date(),
      };
    }

    const record = payload as Record<string, unknown>;
    const data = (record.data ?? record) as Record<string, unknown>;
    const eventRaw = String(record.event ?? record.eventType ?? record.type ?? '');
    const transactionId = String(
      data.transactionId ?? data.transaction_id ?? data.id ?? '',
    );
    const merchantAccountId = String(
      data.merchantAccountId ??
        data.merchant_account_id ??
        data.merchantId ??
        data.merchant_id ??
        data.businessId ??
        data.business_id ??
        '',
    );
    const amountRaw =
      data.amountNaira ?? data.amount_naira ?? data.amount ?? data.totalAmount;

    if (!transactionId || amountRaw === undefined) {
      throw new Error('Invalid ALATPay webhook payload');
    }

    return {
      eventType: normalizeWebhookEvent(eventRaw),
      transactionId,
      merchantAccountId,
      amountNaira: new Decimal(Number(amountRaw)),
      customerName: String(
        data.customerName ?? data.customer_name ?? data.customerEmail ?? 'Customer',
      ),
      customerPhone: (data.customerPhone ?? data.customer_phone) as string | undefined,
      channel: normalizeChannel(String(data.channel ?? data.paymentChannel ?? 'unknown')),
      reference: String(data.reference ?? data.orderId ?? data.order_id ?? transactionId),
      receivedAt: record.timestamp
        ? new Date(String(record.timestamp))
        : new Date(),
    };
  },
};

function normalizeWebhookEvent(event: string): string {
  const lower = event.toLowerCase();
  if (
    lower === 'payment.success' ||
    lower === 'payment_success' ||
    lower === 'transaction.success' ||
    lower === 'successful'
  ) {
    return 'transaction.received';
  }
  return event;
}

export function getALATPayHealth(): ALATPayHealth {
  const circuit = payoutCircuit.getState();
  const mock = useMockMode();
  return {
    mode: mock ? 'mock' : 'production',
    officialSdk: !mock,
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
