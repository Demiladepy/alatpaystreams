/**
 * Backfill 90 days of realistic transaction history for a merchant so the
 * underwriting scorecard has real signals to work with (volume, growth,
 * velocity, customer diversity, tenure).
 *
 * Writes Transaction + Split rows directly with computeSplit — no Redis,
 * no SSE noise — then applies one balance update per bucket.
 *
 * Usage: npx tsx scripts/seed-history.ts <merchantId>
 * Refuses to run twice: existing rows tagged raw.backfill=true abort the run.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { computeSplit } from '../src/services/splitEngine';
import { computeSignalsFromTransactions } from '../src/services/underwriting/signals';
import type { RawTransactionInput } from '../src/services/underwriting/signals';
import type { BucketRule } from '../src/types';

const prisma = new PrismaClient();

const MERCHANT_ID = process.argv[2];

const CUSTOMERS = [
  'Chiamaka Okafor',
  'Tunde Bakare',
  'Ngozi Eze',
  'Emeka Obi',
  'Aisha Bello',
  'Yemi Adeyemi',
  'Bola Johnson',
  'Ifeoma Nwosu',
  'Segun Adewale',
  'Halima Yusuf',
  'Chidi Anyanwu',
  'Funmi Alade',
  'Kelechi Umeh',
  'Zainab Musa',
] as const;

const CHANNELS = ['transfer', 'card', 'tap_and_pay', 'ussd'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random amount in naira, rounded to ₦50, mean scaled per 30-day phase. */
function randomAmount(meanNaira: number): number {
  const raw = meanNaira * (0.45 + Math.random() * 1.1);
  const bigOrder = Math.random() < 0.04 ? 80_000 + Math.random() * 70_000 : 0;
  return Math.round((raw + bigOrder) / 50) * 50;
}

function businessHour(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return d;
}

interface PlannedTx {
  amountNaira: number;
  receivedAt: Date;
  source: 'CUSTOMER_PAYMENT' | 'REFUND';
  customerName: string;
  channel: string;
  settlementStatus: 'settled' | 'failed';
}

function planHistory(): PlannedTx[] {
  const txs: PlannedTx[] = [];

  for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
    // Older → younger: mean ticket grows ₦15k → ₦19k for a healthy growth ratio.
    const phaseMean = daysAgo > 60 ? 15_000 : daysAgo > 30 ? 17_000 : 19_000;
    const perDay = 3 + Math.floor(Math.random() * 3); // 3–5, keeps velocity CoV low

    for (let i = 0; i < perDay; i++) {
      txs.push({
        amountNaira: randomAmount(phaseMean),
        receivedAt: businessHour(daysAgo),
        source: 'CUSTOMER_PAYMENT',
        customerName: pick(CUSTOMERS),
        channel: pick(CHANNELS),
        settlementStatus: 'settled',
      });
    }
  }

  // Two failed settlements in the prior-30 window — reliability stays >98%.
  txs[40].settlementStatus = 'failed';
  txs[170].settlementStatus = 'failed';

  // Two small refunds — refund rate well under the 2% "excellent" band.
  for (const daysAgo of [52, 17]) {
    txs.push({
      amountNaira: 6_000 + Math.round(Math.random() * 6_000),
      receivedAt: businessHour(daysAgo),
      source: 'REFUND',
      customerName: pick(CUSTOMERS),
      channel: 'transfer',
      settlementStatus: 'settled',
    });
  }

  return txs;
}

async function main() {
  if (!MERCHANT_ID) {
    throw new Error('Usage: npx tsx scripts/seed-history.ts <merchantId>');
  }

  const merchant = await prisma.merchant.findUnique({ where: { id: MERCHANT_ID } });
  if (!merchant) throw new Error(`Merchant ${MERCHANT_ID} not found`);

  const existing = await prisma.transaction.findFirst({
    where: { merchantId: MERCHANT_ID, raw: { path: ['backfill'], equals: true } },
  });
  if (existing) {
    throw new Error('Backfill rows already present — refusing to run twice.');
  }

  const buckets = await prisma.bucket.findMany({
    where: { merchantId: MERCHANT_ID, isActive: true },
    orderBy: { priority: 'asc' },
  });
  if (buckets.length === 0) throw new Error('No active buckets');

  const splitBuckets = buckets.map((b) => ({
    id: b.id,
    rule: b.rule as unknown as BucketRule,
    priority: b.priority,
    isActive: b.isActive,
  }));

  const planned = planHistory();

  // Dry-run the scorecard against planned history + what's already in the DB
  // before writing anything.
  const existingTxs = await prisma.transaction.findMany({
    where: { merchantId: MERCHANT_ID },
  });

  // Pre-assign round-robin customer names to untagged rows so the dry-run
  // sees the same data the update below will write.
  const pendingNames = new Map<string, string>();
  existingTxs.forEach((tx, i) => {
    const raw = (tx.raw ?? {}) as Record<string, unknown>;
    if (!raw.customerName) pendingNames.set(tx.id, CUSTOMERS[i % CUSTOMERS.length]);
  });

  const signalInput: RawTransactionInput[] = [
    ...existingTxs.map((tx) => {
      const raw = (tx.raw ?? {}) as Record<string, unknown>;
      return {
        amountNaira: tx.amountNaira.toString(),
        receivedAt: tx.receivedAt,
        source: tx.source as RawTransactionInput['source'],
        raw: pendingNames.has(tx.id) ? { ...raw, customerName: pendingNames.get(tx.id) } : tx.raw,
      };
    }),
    ...planned.map((tx) => ({
      amountNaira: tx.amountNaira,
      receivedAt: tx.receivedAt,
      source: tx.source,
      raw: { customerName: tx.customerName },
      settlementStatus: tx.settlementStatus,
    })),
  ];
  const signals = computeSignalsFromTransactions(signalInput);
  console.log('Projected signals:', {
    last30: signals.last30DaysVolumeNaira,
    prior30: signals.prior30DaysVolumeNaira,
    growthRatio: signals.growthRatio.toFixed(2),
    velocityCoV: signals.velocityCoV.toFixed(2),
    topCustomerShare: signals.topCustomerShare.toFixed(3),
    refundRate: signals.refundRatePct.toFixed(4),
    tenureDays: signals.tenureDays,
    settlement: signals.settlementReliabilityPct.toFixed(3),
    structuring: signals.structuringFlag,
    spike: signals.suspiciousGrowthSpike,
  });
  if (signals.growthRatio > 2.9 || signals.structuringFlag || signals.topCustomerShare >= 0.2) {
    throw new Error('Planned history would not score well — aborting before write.');
  }

  // Give today's untagged simulate transactions customer names so they stop
  // registering as one anonymous mega-customer in the concentration signal.
  for (const tx of existingTxs) {
    const name = pendingNames.get(tx.id);
    if (!name) continue;
    const raw = (tx.raw ?? {}) as Record<string, unknown>;
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { raw: { ...raw, customerName: name } as Prisma.InputJsonValue },
    });
  }
  console.log(`Tagged ${pendingNames.size} existing transactions with customer names`);

  const balanceIncrements = new Map<string, Decimal>();
  let written = 0;
  let volume = new Decimal(0);

  for (const tx of planned) {
    const isRefund = tx.source === 'REFUND';
    const splits = isRefund ? [] : computeSplit(tx.amountNaira, splitBuckets, tx.receivedAt);

    await prisma.transaction.create({
      data: {
        merchantId: MERCHANT_ID,
        amountNaira: new Decimal(tx.amountNaira).toFixed(2),
        source: tx.source,
        receivedAt: tx.receivedAt,
        raw: {
          backfill: true,
          customerName: tx.customerName,
          channel: tx.channel,
          settlementStatus: tx.settlementStatus,
        } as Prisma.InputJsonValue,
        splits: {
          create: splits.map((s) => ({ bucketId: s.bucketId, amountNaira: s.amountNaira })),
        },
      },
    });

    if (!isRefund) {
      volume = volume.plus(tx.amountNaira);
      for (const s of splits) {
        if (s.bucketId) {
          balanceIncrements.set(
            s.bucketId,
            (balanceIncrements.get(s.bucketId) ?? new Decimal(0)).plus(s.amountNaira),
          );
        }
      }
    }

    written++;
    if (written % 50 === 0) console.log(`  ${written}/${planned.length} transactions written`);
  }

  for (const [bucketId, inc] of balanceIncrements) {
    await prisma.bucket.update({
      where: { id: bucketId },
      data: { balance: { increment: inc.toFixed(2) } },
    });
  }

  console.log(`Done: ${written} transactions, ₦${volume.toFixed(2)} gross volume over 90 days`);
  for (const b of buckets) {
    const inc = balanceIncrements.get(b.id) ?? new Decimal(0);
    console.log(`  ${b.name}: +₦${inc.toFixed(2)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
