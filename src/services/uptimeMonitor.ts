import { redis } from '../lib/redis';

export interface BankHealth {
  bankCode: string;
  bankName: string;
  recentSuccessRate: number;
  avgSettlementMs: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  status: 'healthy' | 'degraded' | 'offline';
  prediction: {
    confidence: number;
    expectedSettlementSeconds: number;
    advisory: string;
  };
}

export interface PayoutAttemptRecord {
  success: boolean;
  settlementMs: number;
  at: number;
}

export const NIGERIAN_BANKS: Array<{ bankCode: string; bankName: string }> = [
  { bankCode: 'GTB', bankName: 'GTBank' },
  { bankCode: 'ACCESS', bankName: 'Access Bank' },
  { bankCode: 'ZENITH', bankName: 'Zenith Bank' },
  { bankCode: 'UBA', bankName: 'UBA' },
  { bankCode: 'FIRST', bankName: 'First Bank' },
  { bankCode: 'STANBIC', bankName: 'Stanbic IBTC' },
  { bankCode: 'FBN', bankName: 'FBNQuest' },
  { bankCode: 'POLARIS', bankName: 'Polaris Bank' },
];

const WINDOW_SIZE = 100;
const KEY_PREFIX = 'uptime:bank:';

function attemptsKey(bankCode: string): string {
  return `${KEY_PREFIX}${bankCode}:attempts`;
}

function parseAttempt(member: string): PayoutAttemptRecord | null {
  try {
    return JSON.parse(member) as PayoutAttemptRecord;
  } catch {
    return null;
  }
}

function computeStatus(
  successRate: number,
  avgSettlementMs: number,
  lastSuccessAt: Date | null,
): BankHealth['status'] {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (!lastSuccessAt || lastSuccessAt.getTime() < fiveMinutesAgo) {
    if (successRate < 0.8) return 'offline';
  }
  if (successRate < 0.8) return 'offline';
  if (successRate >= 0.95 && avgSettlementMs < 10_000) return 'healthy';
  if (successRate >= 0.8 || avgSettlementMs <= 30_000) return 'degraded';
  return 'offline';
}

function buildPrediction(
  status: BankHealth['status'],
  successRate: number,
  avgSettlementMs: number,
  bankName: string,
): BankHealth['prediction'] {
  const expectedSettlementSeconds = Math.max(1, Math.round(avgSettlementMs / 1000));
  if (status === 'healthy') {
    return {
      confidence: Math.min(0.99, 0.85 + successRate * 0.1),
      expectedSettlementSeconds,
      advisory: `${bankName} looking healthy — expected settlement in ${expectedSettlementSeconds} seconds.`,
    };
  }
  if (status === 'degraded') {
    return {
      confidence: 0.75,
      expectedSettlementSeconds,
      advisory: `${bankName} is running slow today — expected settlement ~${expectedSettlementSeconds} seconds.`,
    };
  }
  return {
    confidence: 0.4,
    expectedSettlementSeconds: 120,
    advisory: `${bankName} is currently degraded — we'll queue this and retry in the next few minutes.`,
  };
}

async function loadAttempts(bankCode: string): Promise<PayoutAttemptRecord[]> {
  const raw = await redis.zrevrange(attemptsKey(bankCode), 0, WINDOW_SIZE - 1);
  return raw.map(parseAttempt).filter((a): a is PayoutAttemptRecord => a !== null);
}

export async function recordPayoutAttempt(
  bankCode: string,
  success: boolean,
  settlementMs = 4000,
): Promise<void> {
  const at = Date.now();
  const record: PayoutAttemptRecord = { success, settlementMs, at };
  const key = attemptsKey(bankCode);
  await redis.zadd(key, at, JSON.stringify(record));
  const count = await redis.zcard(key);
  if (count > WINDOW_SIZE) {
    await redis.zremrangebyrank(key, 0, count - WINDOW_SIZE - 1);
  }
}

export async function getBankHealth(bankCode: string): Promise<BankHealth> {
  const meta = NIGERIAN_BANKS.find((b) => b.bankCode === bankCode) ?? {
    bankCode,
    bankName: bankCode,
  };
  const attempts = await loadAttempts(bankCode);

  if (attempts.length === 0) {
    return {
      bankCode: meta.bankCode,
      bankName: meta.bankName,
      recentSuccessRate: 1,
      avgSettlementMs: 4000,
      lastSuccessAt: new Date(),
      lastFailureAt: null,
      status: 'healthy',
      prediction: buildPrediction('healthy', 1, 4000, meta.bankName),
    };
  }

  const successes = attempts.filter((a) => a.success);
  const successRate = successes.length / attempts.length;
  const avgSettlementMs =
    successes.length > 0
      ? successes.reduce((s, a) => s + a.settlementMs, 0) / successes.length
      : 30_000;

  const lastSuccess = successes[0]?.at ?? null;
  const lastFailure = attempts.find((a) => !a.success)?.at ?? null;

  const status = computeStatus(
    successRate,
    avgSettlementMs,
    lastSuccess ? new Date(lastSuccess) : null,
  );

  return {
    bankCode: meta.bankCode,
    bankName: meta.bankName,
    recentSuccessRate: successRate,
    avgSettlementMs,
    lastSuccessAt: lastSuccess ? new Date(lastSuccess) : null,
    lastFailureAt: lastFailure ? new Date(lastFailure) : null,
    status,
    prediction: buildPrediction(status, successRate, avgSettlementMs, meta.bankName),
  };
}

export async function getAllBankHealth(): Promise<BankHealth[]> {
  return Promise.all(NIGERIAN_BANKS.map((b) => getBankHealth(b.bankCode)));
}

export async function getBankHealthHistory(
  bankCode: string,
  hours = 24,
): Promise<Array<{ hour: string; successRate: number }>> {
  const attempts = await loadAttempts(bankCode);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const buckets = new Map<string, { ok: number; total: number }>();

  for (const attempt of attempts) {
    if (attempt.at < cutoff) continue;
    const hour = new Date(attempt.at).toISOString().slice(0, 13);
    const bucket = buckets.get(hour) ?? { ok: 0, total: 0 };
    bucket.total += 1;
    if (attempt.success) bucket.ok += 1;
    buckets.set(hour, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, stats]) => ({
      hour,
      successRate: stats.total > 0 ? stats.ok / stats.total : 1,
    }));
}

export async function seedUptimeMonitor(): Promise<void> {
  const seeded = await redis.get('uptime:seeded');
  if (seeded) return;

  const now = Date.now();
  const profiles: Record<string, { successRate: number; avgMs: number }> = {
    GTB: { successRate: 0.991, avgMs: 3800 },
    ACCESS: { successRate: 0.97, avgMs: 5200 },
    ZENITH: { successRate: 0.96, avgMs: 6100 },
    UBA: { successRate: 0.94, avgMs: 7200 },
    FIRST: { successRate: 0.93, avgMs: 8400 },
    STANBIC: { successRate: 0.87, avgMs: 22_000 },
    FBN: { successRate: 0.92, avgMs: 9500 },
    POLARIS: { successRate: 0.62, avgMs: 45_000 },
  };

  for (const bank of NIGERIAN_BANKS) {
    const profile = profiles[bank.bankCode] ?? { successRate: 0.95, avgMs: 5000 };
    for (let i = 0; i < 80; i++) {
      const at = now - i * 15 * 60 * 1000 + Math.floor(Math.random() * 60_000);
      const success = Math.random() < profile.successRate;
      const settlementMs = success
        ? Math.round(profile.avgMs * (0.8 + Math.random() * 0.4))
        : 0;
      await redis.zadd(
        attemptsKey(bank.bankCode),
        at,
        JSON.stringify({ success, settlementMs, at }),
      );
    }
  }

  await redis.set('uptime:seeded', '1', 'EX', 86400 * 7);
}
