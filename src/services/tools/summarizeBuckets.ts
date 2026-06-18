import Decimal from 'decimal.js';
import { prisma } from '../../lib/db';
import { subDays, daysUntilNextVatFiling, formatNaira } from '../dateUtils';

export interface SummarizeBucketsInput {
  merchantId: string;
}

export async function summarizeBuckets(input: SummarizeBucketsInput) {
  const buckets = await prisma.bucket.findMany({
    where: { merchantId: input.merchantId, isActive: true },
    orderBy: { priority: 'asc' },
  });

  const sevenDaysAgo = subDays(new Date(), 7);
  const fourteenDaysAgo = subDays(new Date(), 14);

  const recentSplits = await prisma.split.findMany({
    where: {
      bucketId: { in: buckets.map((b) => b.id) },
      createdAt: { gte: fourteenDaysAgo },
    },
    include: { bucket: true },
  });

  const inflow7 = new Map<string, Decimal>();
  const inflowPrior7 = new Map<string, Decimal>();

  for (const split of recentSplits) {
    if (!split.bucketId) continue;
    const amount = new Decimal(split.amountNaira.toString());
    const map = split.createdAt >= sevenDaysAgo ? inflow7 : inflowPrior7;
    map.set(split.bucketId, (map.get(split.bucketId) ?? new Decimal(0)).plus(amount));
  }

  const bucketSummaries = buckets.map((bucket) => {
    const current = inflow7.get(bucket.id) ?? new Decimal(0);
    const prior = inflowPrior7.get(bucket.id) ?? new Decimal(0);
    const growth =
      prior.gt(0) ? current.minus(prior).div(prior).mul(100).toDecimalPlaces(1).toNumber() : null;

    return {
      id: bucket.id,
      name: bucket.name,
      type: bucket.type,
      balanceNaira: bucket.balance.toString(),
      inflowLast7Days: current.toFixed(2),
      inflowGrowthPercent: growth,
      rule: bucket.rule,
    };
  });

  const totalInflow7 = bucketSummaries.reduce(
    (sum, b) => sum.plus(b.inflowLast7Days),
    new Decimal(0),
  );

  const observations: string[] = [];
  const savings = bucketSummaries.find((b) => b.type === 'SAVINGS');
  if (
    savings &&
    savings.inflowGrowthPercent !== null &&
    savings.inflowGrowthPercent > 10
  ) {
    observations.push(
      `Your savings bucket grew ${savings.inflowGrowthPercent}% this week.`,
    );
  }

  const tax = bucketSummaries.find((b) => b.type === 'TAX');
  const daysUntilVat = daysUntilNextVatFiling();
  if (tax) {
    observations.push(
      `Your tax bucket is at ${formatNaira(parseFloat(tax.balanceNaira))} with VAT filing in about ${daysUntilVat} days.`,
    );
  }

  if (totalInflow7.gt(0)) {
    observations.push(`Total routed across buckets this week: ${formatNaira(totalInflow7.toNumber())}.`);
  }

  if (observations.length === 0) {
    observations.push('Steady week — no major shifts in your bucket flows yet.');
  }

  return {
    buckets: bucketSummaries,
    totalInflowLast7Days: totalInflow7.toFixed(2),
    observations: observations.join(' '),
  };
}

export const summarizeBucketsDefinition = {
  name: 'summarize_buckets',
  description: 'Get bucket balances, recent inflows, and business observations.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string' },
    },
    required: ['merchantId'],
  },
};
