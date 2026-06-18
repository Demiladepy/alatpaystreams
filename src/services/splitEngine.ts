import Decimal from 'decimal.js';
import type { BucketRule, SplitBucket, SplitResult } from '../types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

const HUNDRED = new Decimal(100);

function bankerRound(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

function parseRule(rule: unknown): BucketRule {
  const r = rule as BucketRule;
  if (!r?.kind || typeof r.value !== 'number') {
    throw new Error('Invalid bucket rule');
  }
  return r;
}

function isWeeklyFixedDue(rule: BucketRule, now: Date): boolean {
  if (rule.kind !== 'WEEKLY_FIXED') {
    return false;
  }
  if (rule.dayOfWeek === undefined) {
    throw new Error('WEEKLY_FIXED rule requires dayOfWeek');
  }
  return now.getDay() === rule.dayOfWeek;
}

function reconcileTotal(
  splits: Array<{ bucketId: string | null; amount: Decimal }>,
  target: Decimal,
): SplitResult[] {
  if (splits.length === 0) {
    return [{ bucketId: null, amountNaira: target.toFixed(2) }];
  }

  const rounded = splits.map((split) => ({
    bucketId: split.bucketId,
    amount: bankerRound(split.amount),
  }));

  const sum = rounded.reduce((acc, split) => acc.plus(split.amount), new Decimal(0));
  const diff = target.minus(sum);

  if (!diff.isZero()) {
    let largestIdx = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i].amount.gt(rounded[largestIdx].amount)) {
        largestIdx = i;
      }
    }
    rounded[largestIdx].amount = rounded[largestIdx].amount.plus(diff);
  }

  return rounded.map((split) => ({
    bucketId: split.bucketId,
    amountNaira: split.amount.toFixed(2),
  }));
}

/**
 * Pure split engine — no DB or side effects.
 * Applies FIXED / WEEKLY_FIXED first, then PERCENTAGE on the remainder.
 * Unallocated funds go to the virtual Merchant Operating bucket (bucketId = null).
 */
export function computeSplit(
  amount: Decimal | string | number,
  buckets: SplitBucket[],
  now: Date = new Date(),
): SplitResult[] {
  const total = new Decimal(amount);
  if (total.isNegative()) {
    throw new Error('Amount must be non-negative');
  }

  const active = buckets
    .filter((bucket) => bucket.isActive)
    .map((bucket) => ({
      ...bucket,
      rule: typeof bucket.rule === 'object' ? bucket.rule : parseRule(bucket.rule),
    }))
    .sort((a, b) => a.priority - b.priority);

  let remaining = total;
  const rawSplits: Array<{ bucketId: string | null; amount: Decimal }> = [];

  const fixedBuckets = active.filter(
    (bucket) =>
      bucket.rule.kind === 'FIXED' ||
      (bucket.rule.kind === 'WEEKLY_FIXED' && isWeeklyFixedDue(bucket.rule, now)),
  );

  for (const bucket of fixedBuckets) {
    if (remaining.isZero()) {
      break;
    }
    const allocation = Decimal.min(new Decimal(bucket.rule.value), remaining);
    if (allocation.gt(0)) {
      rawSplits.push({ bucketId: bucket.id, amount: allocation });
      remaining = remaining.minus(allocation);
    }
  }

  const percentageBuckets = active.filter((bucket) => bucket.rule.kind === 'PERCENTAGE');
  const percentageBase = remaining;

  for (const bucket of percentageBuckets) {
    if (remaining.isZero() || percentageBase.isZero()) {
      break;
    }
    const share = percentageBase.mul(new Decimal(bucket.rule.value)).div(HUNDRED);
    const allocation = Decimal.min(share, remaining);
    if (allocation.gt(0)) {
      rawSplits.push({ bucketId: bucket.id, amount: allocation });
      remaining = remaining.minus(allocation);
    }
  }

  if (remaining.gt(0)) {
    rawSplits.push({ bucketId: null, amount: remaining });
  }

  return reconcileTotal(rawSplits, total);
}

export { Decimal, bankerRound };
