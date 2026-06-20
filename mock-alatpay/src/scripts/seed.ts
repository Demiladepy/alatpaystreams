import type { Merchant, Transaction } from '../types';
import { DEMO_MERCHANT_ID } from '../types';
import {
  CUSTOMER_NAMES,
  pickChannel,
  sampleTicketSize,
  txsPerDay,
} from '../services/simulator';
import {
  generateReference,
  generateTransactionId,
  randomNigerianPhone,
} from '../routes/webhooks';
import { writeMerchants, writeTransactions } from '../services/storage';

const DAYS = 90;
const TARGET_TX_COUNT = 500;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function dailyVolumeTarget(dayIndex: number, totalDays: number): number {
  const min = 60_000;
  const max = 95_000;
  const t = dayIndex / (totalDays - 1);
  return min + (max - min) * t;
}

function splitDailyTotal(total: number, count: number): number[] {
  const raw = Array.from({ length: count }, () => sampleTicketSize());
  const sum = raw.reduce((a, b) => a + b, 0);
  const amounts = raw.map((a) => Math.max(500, Math.round((a / sum) * total)));

  const actual = amounts.reduce((a, b) => a + b, 0);
  const diff = total - actual;
  if (diff !== 0) {
    const largest = amounts.indexOf(Math.max(...amounts));
    amounts[largest] += diff;
  }

  return amounts;
}

function pickCustomerWithRepeat(): string {
  if (Math.random() < 0.35) {
    const top = CUSTOMER_NAMES.slice(0, 12);
    return top[Math.floor(Math.random() * top.length)];
  }
  return CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
}

interface DayPlan {
  date: Date;
  dayIndex: number;
  targetTotal: number;
  txCount: number;
}

function buildDayPlans(now: Date): DayPlan[] {
  const plans: DayPlan[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayIndex = DAYS - 1 - i;
    plans.push({
      date,
      dayIndex,
      targetTotal: dailyVolumeTarget(dayIndex, DAYS),
      txCount: txsPerDay(date),
    });
  }

  const recent7 = plans.slice(-7);
  const prior7 = plans.slice(-14, -7);
  const priorSum = prior7.reduce((s, p) => s + p.targetTotal, 0);
  const recentTarget = priorSum * 1.22;
  const recentBase = recent7.reduce((s, p) => s + p.targetTotal, 0);
  const scale = recentTarget / recentBase;

  for (const plan of recent7) {
    plan.targetTotal = Math.round(plan.targetTotal * scale);
  }

  let totalTxs = plans.reduce((s, p) => s + p.txCount, 0);
  while (totalTxs > TARGET_TX_COUNT + 30) {
    const idx = Math.floor(Math.random() * plans.length);
    if (plans[idx].txCount > 4) {
      plans[idx].txCount -= 1;
      totalTxs -= 1;
    }
  }
  while (totalTxs < TARGET_TX_COUNT - 30) {
    const idx = Math.floor(Math.random() * plans.length);
    if (plans[idx].txCount < 9) {
      plans[idx].txCount += 1;
      totalTxs += 1;
    }
  }

  return plans;
}

function calibrateRecentGrowth(transactions: Transaction[], now: Date): Transaction[] {
  const msPerDay = 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  const inWindow = (tx: Transaction, minDays: number, maxDays: number) => {
    const ageDays = (nowMs - new Date(tx.timestamp).getTime()) / msPerDay;
    return ageDays > minDays && ageDays <= maxDays;
  };

  const sumWindow = (txs: Transaction[], minDays: number, maxDays: number) =>
    txs
      .filter((tx) => inWindow(tx, minDays, maxDays))
      .reduce((s, tx) => s + tx.amountNaira, 0);

  let result = [...transactions];

  for (let i = 0; i < 5; i++) {
    const priorSum = sumWindow(result, 7, 14);
    const recentSum = sumWindow(result, 0, 7);
    if (priorSum <= 0 || recentSum <= 0) {
      break;
    }

    const ratio = (priorSum * 1.22) / recentSum;
    if (Math.abs(ratio - 1) < 0.002) {
      break;
    }

    result = result.map((tx) => {
      if (!inWindow(tx, 0, 7) || tx.type !== 'payment') {
        return tx;
      }
      return {
        ...tx,
        amountNaira: Math.max(500, Math.round(tx.amountNaira * ratio)),
      };
    });
  }

  const priorSum = sumWindow(result, 7, 14);
  const targetRecent = priorSum * 1.22;
  const recentSum = sumWindow(result, 0, 7);
  const diff = Math.round(targetRecent - recentSum);

  if (diff !== 0) {
    const recentPaymentIdx = result
      .map((tx, idx) => ({ tx, idx }))
      .filter(({ tx }) => inWindow(tx, 0, 7) && tx.type === 'payment')
      .sort((a, b) => b.tx.amountNaira - a.tx.amountNaira)[0]?.idx;

    if (recentPaymentIdx !== undefined) {
      result[recentPaymentIdx] = {
        ...result[recentPaymentIdx],
        amountNaira: Math.max(500, result[recentPaymentIdx].amountNaira + diff),
      };
    }
  }

  return result;
}

function generateTransactions(plans: DayPlan[], merchantId: string, now: Date): Transaction[] {
  const transactions: Transaction[] = [];

  for (const plan of plans) {
    const amounts = splitDailyTotal(plan.targetTotal, plan.txCount);

    for (let i = 0; i < amounts.length; i++) {
      const isRefund = Math.random() < 0.02;
      const ts = startOfDay(plan.date);
      ts.setMinutes(ts.getMinutes() + i * 45 + Math.floor(Math.random() * 20));

      const daysAgo = Math.floor(
        (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24),
      );

      transactions.push({
        transactionId: generateTransactionId(),
        merchantAccountId: merchantId,
        amountNaira: isRefund ? -amounts[i] : amounts[i],
        customerName: pickCustomerWithRepeat(),
        customerPhone: randomNigerianPhone(),
        channel: pickChannel(daysAgo),
        reference: generateReference(),
        timestamp: ts.toISOString(),
        type: isRefund ? 'refund' : 'payment',
        status: 'successful',
      });
    }
  }

  const sorted = transactions.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return calibrateRecentGrowth(sorted, now);
}

export function buildSeedData(now = new Date()): {
  merchant: Merchant;
  transactions: Transaction[];
} {
  const createdAt = new Date(now);
  createdAt.setDate(createdAt.getDate() - DAYS);

  const merchant: Merchant = {
    id: DEMO_MERCHANT_ID,
    accountName: 'Funke Adebayo Beauty Ltd',
    phone: '+2348012345678',
    balanceNaira: 145_000,
    status: 'active',
    createdAt: createdAt.toISOString(),
    bankCode: 'GTB',
    bankName: 'GTBank',
  };

  const plans = buildDayPlans(now);
  const transactions = generateTransactions(plans, merchant.id, now);

  return { merchant, transactions };
}

async function main(): Promise<void> {
  const { merchant, transactions } = buildSeedData();

  const recent7 = transactions.filter((tx) => {
    const age = (Date.now() - new Date(tx.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return age <= 7;
  });
  const prior7 = transactions.filter((tx) => {
    const age = (Date.now() - new Date(tx.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return age > 7 && age <= 14;
  });

  const recentSum = recent7.reduce((s, tx) => s + tx.amountNaira, 0);
  const priorSum = prior7.reduce((s, tx) => s + tx.amountNaira, 0);
  const growth = priorSum > 0 ? ((recentSum - priorSum) / priorSum) * 100 : 0;

  await writeMerchants([merchant]);
  await writeTransactions(transactions);

  console.log('Seed complete');
  console.log(`  Merchant: ${merchant.accountName} (${merchant.id})`);
  console.log(`  Transactions: ${transactions.length}`);
  console.log(`  Recent 7d volume: ₦${recentSum.toLocaleString()}`);
  console.log(`  Prior 7d volume:  ₦${priorSum.toLocaleString()}`);
  console.log(`  Growth: ${growth.toFixed(1)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
