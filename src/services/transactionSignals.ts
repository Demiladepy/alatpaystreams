import { prisma } from '../lib/db';
import { subDays } from './dateUtils';
import {
  computeSignalsFromTransactions,
  type RawTransactionInput,
  type SettlementStatus,
} from './underwriting/signals';

/** @deprecated Use ComputedSignals from underwriting module */
export type TransactionSignals = ReturnType<typeof toLegacySignals>;

function toLegacySignals(signals: ReturnType<typeof computeSignalsFromTransactions>) {
  return {
    last30DaysVolume: signals.last30DaysVolumeNaira,
    growthRateVsPrior30: signals.growthRatio - 1,
    txCount: 0,
    customerConcentration: signals.topCustomerShare,
    refundRate: signals.refundRatePct,
    tenureDays: signals.tenureDays,
    velocityCoV: signals.velocityCoV,
    settlementReliabilityPct: signals.settlementReliabilityPct,
    structuringFlag: signals.structuringFlag,
    suspiciousGrowthSpike: signals.suspiciousGrowthSpike,
  };
}

function mapPrismaTx(tx: {
  amountNaira: { toString(): string };
  receivedAt: Date;
  source: string;
  raw: unknown;
}): RawTransactionInput {
  let settlementStatus: SettlementStatus = 'settled';
  if (tx.raw && typeof tx.raw === 'object' && 'settlementStatus' in tx.raw) {
    const raw = (tx.raw as { settlementStatus?: string }).settlementStatus;
    if (raw === 'failed' || raw === 'retry' || raw === 'settled') {
      settlementStatus = raw;
    }
  }

  return {
    amountNaira: tx.amountNaira.toString(),
    receivedAt: tx.receivedAt,
    source: tx.source as RawTransactionInput['source'],
    raw: tx.raw,
    settlementStatus,
  };
}

export async function collectTransactionSignals(merchantId: string) {
  const since = subDays(new Date(), 90);
  const transactions = await prisma.transaction.findMany({
    where: { merchantId, receivedAt: { gte: since } },
    orderBy: { receivedAt: 'desc' },
  });

  const inputs = transactions.map(mapPrismaTx);
  const computed = computeSignalsFromTransactions(inputs);

  const last30Start = subDays(new Date(), 30);
  const txCount = transactions.filter(
    (tx) =>
      tx.receivedAt >= last30Start &&
      tx.source !== 'REFUND' &&
      Number(tx.amountNaira) >= 0,
  ).length;

  const legacy = toLegacySignals(computed);
  return { ...legacy, txCount, _computed: computed };
}

export type CollectedSignals = Awaited<ReturnType<typeof collectTransactionSignals>>;
