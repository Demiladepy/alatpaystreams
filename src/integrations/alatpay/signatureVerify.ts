import crypto from 'crypto';
import type { MockWebhookPayload } from './types';

function getSecret(): string {
  return process.env.ALATPAY_WEBHOOK_SECRET ?? 'dev-webhook-secret-change-me';
}

function hmacHex(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Mock / contract format: HMAC of { event, timestamp, data } without signature field. */
export function verifyContractWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawBody) as MockWebhookPayload;
    const canonical = JSON.stringify({
      event: parsed.event,
      timestamp: parsed.timestamp,
      data: parsed.data,
    });
    return safeEqual(hmacHex(canonical), signature);
  } catch {
    return false;
  }
}

/** Production format: HMAC of the raw request body bytes. */
export function verifyRawBodyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) {
    return false;
  }
  return safeEqual(hmacHex(rawBody), signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return (
    verifyContractWebhookSignature(rawBody, signature) ||
    verifyRawBodyWebhookSignature(rawBody, signature)
  );
}

export function extractSignatureFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const candidates = [
    headers['x-alatpay-signature'],
    headers['alatpay-signature'],
    headers['X-AlatPay-Signature'],
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

export function extractEmbeddedSignature(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as MockWebhookPayload;
    return parsed.signature ?? '';
  } catch {
    return '';
  }
}
