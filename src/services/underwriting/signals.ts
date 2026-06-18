import Decimal from 'decimal.js';
import { subDays } from '../dateUtils';
import {
  CONCENTRATION_HIGH,
  CONCENTRATION_MODERATE,
  CONCENTRATION_WELL_DIVERSIFIED,
  GROWTH_DECLINING_MAX,
  GROWTH_FLAT_MAX,
  GROWTH_HEALTHY_MAX,
  GROWTH_SUSPICIOUS_SPIKE_MIN,
  REFUND_ACCEPTABLE,
  REFUND_ELEVATED,
  REFUND_EXCELLENT,
  SETTLEMENT_RELIABILITY_MIN,
  STRUCTURING_SAME_AMOUNT_DAILY_LIMIT,
  VELOCITY_COV_EXCELLENT,
  VELOCITY_COV_POOR,
  VOLUME_CEILING_NAIRA,
  VOLUME_FLOOR_NAIRA,
} from './constants';

export type TransactionSource = 'CUSTOMER_PAYMENT' | 'MANUAL' | 'REFUND';

export type SettlementStatus = 'settled' | 'failed' | 'retry';

export interface RawTransactionInput {
  amountNaira: number | string;
  receivedAt: Date;
  source?: TransactionSource;
  raw?: unknown;
  settlementStatus?: SettlementStatus;
}

export interface SignalScores {
  volume: number;
  growth: number;
  velocityConsistency: number;
  customerConcentration: number;
  refundRate: number;
  tenure: number;
  settlementReliability: number;
}

/** Raw metrics plus per-signal scores used for composite scoring and explainers. */
export interface ComputedSignals extends SignalScores {
  last30DaysVolumeNaira: number;
  prior30DaysVolumeNaira: number;
  growthRatio: number;
  velocityCoV: number;
  topCustomerShare: number;
  refundRatePct: number;
  tenureDays: number;
  settlementReliabilityPct: number;
  structuringFlag: boolean;
  suspiciousGrowthSpike: boolean;
}

function countActiveDaysInWindow(
  transactions: RawTransactionInput[],
  windowStart: Date,
  windowEnd: Date,
): number {
  const days = new Set<string>();

  for (const tx of transactions) {
    const source = tx.source ?? 'CUSTOMER_PAYMENT';
    if (source === 'REFUND' || new Decimal(tx.amountNaira).lt(0)) continue;
    if (tx.receivedAt >= windowStart && tx.receivedAt < windowEnd) {
      days.add(dayKey(tx.receivedAt));
    }
  }

  return days.size;
}

/**
 * Growth compares last-30 volume to prior-30 volume. For merchants younger than
 * ~75 days, the prior calendar window contains fewer operating days — we
 * pro-rate prior volume so new merchants are not penalised as "declining."
 */
function computeGrowthRatio(
  last30Volume: Decimal,
  prior30Volume: Decimal,
  tenureDays: number,
  transactions: RawTransactionInput[],
  last30Start: Date,
  prior30Start: Date,
): number {
  if (last30Volume.lte(0)) return 0;

  let effectivePrior = prior30Volume;
  const priorActiveDays = countActiveDaysInWindow(
    transactions,
    prior30Start,
    last30Start,
  );

  if (
    priorActiveDays > 0 &&
    priorActiveDays < 28 &&
    tenureDays >= 30 &&
    prior30Volume.gt(0)
  ) {
    effectivePrior = prior30Volume.mul(30).div(priorActiveDays);
  }

  if (effectivePrior.lte(0)) {
    return 1;
  }

  return last30Volume.div(effectivePrior).toNumber();
}

function customerKey(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'customerName' in raw) {
    const name = (raw as { customerName?: string }).customerName;
    if (name) return name;
  }
  return 'unknown';
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function coefficientOfVariation(counts: number[]): number {
  if (counts.length === 0) return VELOCITY_COV_POOR + 1;
  const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
  if (mean === 0) return VELOCITY_COV_POOR + 1;
  const variance =
    counts.reduce((sum, n) => sum + (n - mean) ** 2, 0) / counts.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Volume signal (weight 25%).
 * Intent: reward merchants with meaningful, repeatable inbound flow.
 * Log-linear scale — marginal volume matters less at the top end.
 */
export function scoreVolumeSignal(last30VolumeNaira: number): number {
  if (last30VolumeNaira < VOLUME_FLOOR_NAIRA) return 0;
  if (last30VolumeNaira >= VOLUME_CEILING_NAIRA) return 1;
  const logFloor = Math.log(VOLUME_FLOOR_NAIRA);
  const logCeiling = Math.log(VOLUME_CEILING_NAIRA);
  return (Math.log(last30VolumeNaira) - logFloor) / (logCeiling - logFloor);
}

/**
 * Growth signal (weight 20%).
 * Intent: prefer stable or growing businesses; penalise decline and suspicious spikes.
 * Input is last-30 volume ÷ prior-30 volume (ratio, not percentage change).
 */
export function scoreGrowthSignal(growthRatio: number): {
  score: number;
  suspiciousGrowthSpike: boolean;
} {
  if (growthRatio > GROWTH_SUSPICIOUS_SPIKE_MIN) {
    return { score: 0.6, suspiciousGrowthSpike: true };
  }
  if (growthRatio < GROWTH_DECLINING_MAX) return { score: 0, suspiciousGrowthSpike: false };
  if (growthRatio < GROWTH_FLAT_MAX) return { score: 0.4, suspiciousGrowthSpike: false };
  if (growthRatio <= GROWTH_HEALTHY_MAX) return { score: 0.8, suspiciousGrowthSpike: false };
  return { score: 1, suspiciousGrowthSpike: false };
}

/**
 * Velocity consistency signal (weight 15%).
 * Intent: steady daily sales imply predictable repayment capacity.
 * Uses coefficient of variation of daily transaction counts over the last 30 days.
 */
export function scoreVelocitySignal(cov: number): number {
  if (cov <= VELOCITY_COV_EXCELLENT) return 1;
  if (cov >= VELOCITY_COV_POOR) return 0;
  const span = VELOCITY_COV_POOR - VELOCITY_COV_EXCELLENT;
  return 1 - (cov - VELOCITY_COV_EXCELLENT) / span;
}

/**
 * Customer concentration signal (weight 15%).
 * Intent: penalise single-customer dependency — if they leave, the merchant defaults.
 */
export function scoreConcentrationSignal(topCustomerShare: number): number {
  if (topCustomerShare < CONCENTRATION_WELL_DIVERSIFIED) return 1;
  if (topCustomerShare < CONCENTRATION_MODERATE) return 0.6;
  if (topCustomerShare < CONCENTRATION_HIGH) return 0.3;
  return 0;
}

/**
 * Refund rate signal (weight 10%).
 * Intent: elevated refunds indicate disputes, quality issues, or chargeback risk.
 */
export function scoreRefundSignal(refundRate: number): number {
  if (refundRate < REFUND_EXCELLENT) return 1;
  if (refundRate < REFUND_ACCEPTABLE) return 0.7;
  if (refundRate < REFUND_ELEVATED) return 0.3;
  return 0;
}

/**
 * Tenure signal (weight 10%).
 * Intent: longer ALATPay history reduces uncertainty on seasonality and fraud.
 */
export function scoreTenureSignal(tenureDays: number): number {
  if (tenureDays < 30) return 0.2;
  if (tenureDays < 60) return 0.5;
  if (tenureDays < 90) return 0.8;
  return 1;
}

/**
 * Settlement reliability signal (weight 5%).
 * Intent: failed or retried settlements suggest operational or fraud friction.
 */
export function scoreSettlementSignal(reliabilityPct: number): number {
  return reliabilityPct >= SETTLEMENT_RELIABILITY_MIN ? 1 : 0;
}

function detectStructuring(
  last30Txs: Array<{ amount: Decimal; receivedAt: Date }>,
): boolean {
  const byDayAmount = new Map<string, number>();

  for (const tx of last30Txs) {
    const key = `${dayKey(tx.receivedAt)}|${tx.amount.toFixed(2)}`;
    byDayAmount.set(key, (byDayAmount.get(key) ?? 0) + 1);
    if ((byDayAmount.get(key) ?? 0) > STRUCTURING_SAME_AMOUNT_DAILY_LIMIT) {
      return true;
    }
  }

  return false;
}

export function computeSignalsFromTransactions(
  transactions: RawTransactionInput[],
  referenceDate: Date = new Date(),
): ComputedSignals {
  const last30Start = subDays(referenceDate, 30);
  const prior30Start = subDays(referenceDate, 60);

  let last30Volume = new Decimal(0);
  let prior30Volume = new Decimal(0);
  let grossVolume = new Decimal(0);
  let refundTotal = new Decimal(0);

  const customerTotals = new Map<string, Decimal>();
  const dailyCounts = new Array<number>(30).fill(0);
  const last30PaymentTxs: Array<{ amount: Decimal; receivedAt: Date }> = [];

  let settledCount = 0;
  let totalPaymentAttempts = 0;
  let firstTxDate: Date | null = null;

  for (const tx of transactions) {
    const amount = new Decimal(tx.amountNaira);
    const receivedAt = tx.receivedAt;
    const source = tx.source ?? 'CUSTOMER_PAYMENT';
    const settlement = tx.settlementStatus ?? 'settled';

    if (!firstTxDate || receivedAt < firstTxDate) {
      firstTxDate = receivedAt;
    }

    if (source === 'REFUND' || amount.lt(0)) {
      refundTotal = refundTotal.plus(amount.abs());
      continue;
    }

    grossVolume = grossVolume.plus(amount);
    totalPaymentAttempts += 1;
    if (settlement === 'settled') settledCount += 1;

    if (receivedAt >= last30Start && receivedAt <= referenceDate) {
      last30Volume = last30Volume.plus(amount);
      const customer = customerKey(tx.raw);
      customerTotals.set(
        customer,
        (customerTotals.get(customer) ?? new Decimal(0)).plus(amount),
      );
      last30PaymentTxs.push({ amount, receivedAt });

      const dayIndex = Math.floor(
        (referenceDate.getTime() - receivedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (dayIndex >= 0 && dayIndex < 30) {
        dailyCounts[29 - dayIndex] += 1;
      }
    } else if (receivedAt >= prior30Start && receivedAt < last30Start) {
      prior30Volume = prior30Volume.plus(amount);
    }
  }

  const tenureDays = firstTxDate
    ? Math.max(
        0,
        Math.floor(
          (referenceDate.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const growthRatio = computeGrowthRatio(
    last30Volume,
    prior30Volume,
    tenureDays,
    transactions,
    last30Start,
    prior30Start,
  );

  let topCustomer = new Decimal(0);
  for (const total of customerTotals.values()) {
    if (total.gt(topCustomer)) topCustomer = total;
  }

  const topCustomerShare = last30Volume.gt(0)
    ? topCustomer.div(last30Volume).toNumber()
    : 1;

  const refundRate = grossVolume.gt(0)
    ? refundTotal.div(grossVolume).toNumber()
    : 0;

  const settlementReliabilityPct =
    totalPaymentAttempts > 0 ? settledCount / totalPaymentAttempts : 1;

  const velocityCoV = coefficientOfVariation(dailyCounts);
  const structuringFlag = detectStructuring(last30PaymentTxs);
  const growthResult = scoreGrowthSignal(growthRatio);

  const volumeScore = scoreVolumeSignal(last30Volume.toNumber());
  const velocityScore = scoreVelocitySignal(velocityCoV);
  const concentrationScore = scoreConcentrationSignal(topCustomerShare);
  const refundScore = scoreRefundSignal(refundRate);
  const tenureScore = scoreTenureSignal(tenureDays);
  const settlementScore = scoreSettlementSignal(settlementReliabilityPct);

  return {
    volume: volumeScore,
    growth: growthResult.score,
    velocityConsistency: velocityScore,
    customerConcentration: concentrationScore,
    refundRate: refundScore,
    tenure: tenureScore,
    settlementReliability: settlementScore,
    last30DaysVolumeNaira: last30Volume.toNumber(),
    prior30DaysVolumeNaira: prior30Volume.toNumber(),
    growthRatio,
    velocityCoV,
    topCustomerShare,
    refundRatePct: refundRate,
    tenureDays,
    settlementReliabilityPct,
    structuringFlag,
    suspiciousGrowthSpike: growthResult.suspiciousGrowthSpike,
  };
}

export function fixtureDaysAgoToTransactions(
  fixtureTxs: Array<{
    amountNaira: number;
    daysAgo: number;
    source?: TransactionSource;
    raw?: unknown;
    settlementStatus?: SettlementStatus;
  }>,
  referenceDate: Date,
): RawTransactionInput[] {
  return fixtureTxs.map((tx) => ({
    amountNaira: tx.amountNaira,
    receivedAt: subDays(referenceDate, tx.daysAgo),
    source: tx.source,
    raw: tx.raw,
    settlementStatus: tx.settlementStatus,
  }));
}
