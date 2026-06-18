import Decimal from 'decimal.js';
import { computeSplit } from '../src/services/splitEngine';
import type { SplitBucket } from '../src/types';

function bucket(
  id: string,
  kind: 'PERCENTAGE' | 'FIXED' | 'WEEKLY_FIXED',
  value: number,
  priority: number,
  dayOfWeek?: number,
): SplitBucket {
  return {
    id,
    priority,
    isActive: true,
    rule: { kind, value, ...(dayOfWeek !== undefined ? { dayOfWeek } : {}) },
  };
}

function sumSplits(splits: ReturnType<typeof computeSplit>): Decimal {
  return splits.reduce((acc, s) => acc.plus(s.amountNaira), new Decimal(0));
}

function amountFor(splits: ReturnType<typeof computeSplit>, bucketId: string | null): string {
  return splits
    .filter((s) => s.bucketId === bucketId)
    .reduce((acc, s) => acc.plus(s.amountNaira), new Decimal(0))
    .toFixed(2);
}

describe('computeSplit', () => {
  it('splits purely by percentage across 3 buckets totalling 100%', () => {
    const buckets = [
      bucket('tax', 'PERCENTAGE', 10, 1),
      bucket('savings', 'PERCENTAGE', 30, 2),
      bucket('owner', 'PERCENTAGE', 60, 3),
    ];

    const splits = computeSplit(1000, buckets);

    expect(amountFor(splits, 'tax')).toBe('100.00');
    expect(amountFor(splits, 'savings')).toBe('300.00');
    expect(amountFor(splits, 'owner')).toBe('600.00');
    expect(amountFor(splits, null)).toBe('0.00');
    expect(sumSplits(splits).toFixed(2)).toBe('1000.00');
  });

  it('routes unallocated percentage remainder to Merchant Operating', () => {
    const buckets = [
      bucket('tax', 'PERCENTAGE', 10, 1),
      bucket('savings', 'PERCENTAGE', 20, 2),
      bucket('owner', 'PERCENTAGE', 30, 3),
    ];

    const splits = computeSplit(1000, buckets);

    expect(amountFor(splits, 'tax')).toBe('100.00');
    expect(amountFor(splits, 'savings')).toBe('200.00');
    expect(amountFor(splits, 'owner')).toBe('300.00');
    expect(amountFor(splits, null)).toBe('400.00');
    expect(sumSplits(splits).toFixed(2)).toBe('1000.00');
  });

  it('applies FIXED buckets before PERCENTAGE on the remainder', () => {
    const buckets = [
      bucket('supplier', 'FIXED', 200, 1),
      bucket('tax', 'PERCENTAGE', 10, 2),
      bucket('savings', 'PERCENTAGE', 90, 3),
    ];

    const splits = computeSplit(1000, buckets);

    expect(amountFor(splits, 'supplier')).toBe('200.00');
    expect(amountFor(splits, 'tax')).toBe('80.00');
    expect(amountFor(splits, 'savings')).toBe('720.00');
    expect(amountFor(splits, null)).toBe('0.00');
    expect(sumSplits(splits).toFixed(2)).toBe('1000.00');
  });

  it('caps FIXED allocation when it exceeds the incoming amount', () => {
    const buckets = [
      bucket('supplier', 'FIXED', 500, 1),
      bucket('rent', 'FIXED', 500, 2),
      bucket('savings', 'PERCENTAGE', 100, 3),
    ];

    const splits = computeSplit(300, buckets);

    expect(amountFor(splits, 'supplier')).toBe('300.00');
    expect(amountFor(splits, 'rent')).toBe('0.00');
    expect(amountFor(splits, 'savings')).toBe('0.00');
    expect(amountFor(splits, null)).toBe('0.00');
    expect(sumSplits(splits).toFixed(2)).toBe('300.00');
  });

  it('applies WEEKLY_FIXED only on the configured day of week', () => {
    const buckets = [bucket('rent', 'WEEKLY_FIXED', 150, 1, 1)]; // Monday

    const monday = new Date('2025-06-16T12:00:00'); // Monday
    const tuesday = new Date('2025-06-17T12:00:00');

    const mondaySplits = computeSplit(500, buckets, monday);
    const tuesdaySplits = computeSplit(500, buckets, tuesday);

    expect(amountFor(mondaySplits, 'rent')).toBe('150.00');
    expect(amountFor(mondaySplits, null)).toBe('350.00');

    expect(amountFor(tuesdaySplits, 'rent')).toBe('0.00');
    expect(amountFor(tuesdaySplits, null)).toBe('500.00');
  });

  it('rounds with banker rounding and reconciles to the exact input amount', () => {
    const buckets = [
      bucket('a', 'PERCENTAGE', 33.33, 1),
      bucket('b', 'PERCENTAGE', 33.33, 2),
      bucket('c', 'PERCENTAGE', 33.34, 3),
    ];

    const splits = computeSplit('100.01', buckets);

    expect(sumSplits(splits).toFixed(2)).toBe('100.01');
    expect(splits).toHaveLength(3);

    const amounts = splits.map((s) => s.amountNaira).sort();
    expect(amounts).toEqual(['33.33', '33.33', '33.35']);
  });

  it('respects bucket priority for FIXED allocations', () => {
    const buckets = [
      bucket('low', 'FIXED', 100, 2),
      bucket('high', 'FIXED', 100, 1),
    ];

    const splits = computeSplit(150, buckets);

    expect(amountFor(splits, 'high')).toBe('100.00');
    expect(amountFor(splits, 'low')).toBe('50.00');
    expect(sumSplits(splits).toFixed(2)).toBe('150.00');
  });
});
