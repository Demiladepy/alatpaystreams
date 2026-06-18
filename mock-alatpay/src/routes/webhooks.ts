import crypto from 'crypto';
import type { WebhookPayload } from '../types';

const NETWORK_DELAY_MS = 400;
const WEBHOOK_DELAY_MS = 200;

function getWebhookSecret(): string {
  return process.env.ALATPAY_WEBHOOK_SECRET ?? 'dev-webhook-secret-change-me';
}

function getWebhookUrl(): string | null {
  const url = process.env.WEBHOOK_URL;
  return url && url.trim() !== '' ? url.trim() : null;
}

export function signWebhookBody(
  event: WebhookPayload['event'],
  timestamp: string,
  data: WebhookPayload['data'],
): string {
  const body = JSON.stringify({ event, timestamp, data });
  return crypto.createHmac('sha256', getWebhookSecret()).update(body).digest('hex');
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulateNetworkDelay(): Promise<void> {
  const jitter = Math.floor(Math.random() * 80);
  await delay(NETWORK_DELAY_MS + jitter);
}

export async function sendWebhook(
  event: WebhookPayload['event'],
  data: WebhookPayload['data'],
): Promise<boolean> {
  const url = getWebhookUrl();
  if (!url) {
    console.warn('[mock-alatpay] WEBHOOK_URL not set — skipping webhook');
    return false;
  }

  const timestamp = new Date().toISOString();
  const signature = signWebhookBody(event, timestamp, data);
  const payload: WebhookPayload = { event, timestamp, data, signature };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[mock-alatpay] Webhook failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[mock-alatpay] Webhook error:', err);
    return false;
  }
}

export async function sendTransactionWebhook(
  data: WebhookPayload['data'],
  delayMs = WEBHOOK_DELAY_MS,
): Promise<void> {
  if (delayMs > 0) {
    await delay(delayMs);
  }
  await sendWebhook('transaction.received', data);
}

export async function sendPayoutSettledWebhook(
  data: WebhookPayload['data'],
): Promise<void> {
  await sendWebhook('payout.completed', data);
}

export function shouldPayoutBePending(): boolean {
  return Math.random() < 0.05;
}

export function generateTransactionId(): string {
  return `ALATPAY-${crypto.randomUUID()}`;
}

export function generateReference(): string {
  return `REF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function randomNigerianPhone(): string {
  const prefixes = ['0803', '0806', '0810', '0814', '0903', '0913', '0708'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return `+234${prefix.slice(1)}${suffix}`;
}
