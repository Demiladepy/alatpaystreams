import Decimal from 'decimal.js';
import { redis } from '../../lib/redis';
import type { PayoutResult } from './types';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const WEBHOOK_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

function idempotencyKey(reference: string): string {
  return `alatpay:idempotency:${reference}`;
}

function webhookDedupeKey(transactionId: string): string {
  return `alatpay:webhook:${transactionId}`;
}

export async function getCachedPayout(reference: string): Promise<PayoutResult | null> {
  const raw = await redis.get(idempotencyKey(reference));
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as {
    status: PayoutResult['status'];
    transactionId: string;
    timestamp: string;
    balanceAfter?: string;
    failureReason?: string;
  };

  return {
    status: parsed.status,
    transactionId: parsed.transactionId,
    timestamp: new Date(parsed.timestamp),
    balanceAfter: parsed.balanceAfter ? new Decimal(parsed.balanceAfter) : undefined,
    failureReason: parsed.failureReason,
  };
}

export async function cachePayout(reference: string, result: PayoutResult): Promise<void> {
  await redis.set(
    idempotencyKey(reference),
    JSON.stringify({
      status: result.status,
      transactionId: result.transactionId,
      timestamp: result.timestamp.toISOString(),
      balanceAfter: result.balanceAfter?.toFixed(2),
      failureReason: result.failureReason,
    }),
    'EX',
    IDEMPOTENCY_TTL_SECONDS,
  );
}

/** Returns true if this webhook is new and should be processed. */
export async function claimWebhook(transactionId: string): Promise<boolean> {
  const result = await redis.set(
    webhookDedupeKey(transactionId),
    '1',
    'EX',
    WEBHOOK_DEDUPE_TTL_SECONDS,
    'NX',
  );
  return result === 'OK';
}

export async function releaseWebhookClaim(transactionId: string): Promise<void> {
  await redis.del(webhookDedupeKey(transactionId));
}
