import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { prisma } from '../lib/db';
import { publishTxEvent } from '../lib/redis';
import type { ApplySplitInput, ApplySplitOutput, BucketRule } from '../types';
import { computeSplit } from './splitEngine';

function parseRule(rule: unknown): BucketRule {
  return rule as BucketRule;
}

export async function applySplit(input: ApplySplitInput): Promise<ApplySplitOutput> {
  const amount = new Decimal(input.amountNaira);
  const now = input.now ?? new Date();

  const buckets = await prisma.bucket.findMany({
    where: { merchantId: input.merchantId, isActive: true },
    orderBy: { priority: 'asc' },
  });

  if (buckets.length === 0) {
    throw new Error(`No active buckets for merchant ${input.merchantId}`);
  }

  const splitBuckets = buckets.map((bucket) => ({
    id: bucket.id,
    rule: parseRule(bucket.rule),
    priority: bucket.priority,
    isActive: bucket.isActive,
  }));

  const computedSplits = computeSplit(amount, splitBuckets, now);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        merchantId: input.merchantId,
        amountNaira: amount.toFixed(2),
        source: input.source ?? 'MANUAL',
        externalRef: input.externalRef,
        raw: (input.raw ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        receivedAt: now,
      },
    });

    const splits = await Promise.all(
      computedSplits.map((split) =>
        tx.split.create({
          data: {
            transactionId: transaction.id,
            bucketId: split.bucketId,
            amountNaira: split.amountNaira,
          },
        }),
      ),
    );

    for (const split of computedSplits) {
      if (split.bucketId) {
        await tx.bucket.update({
          where: { id: split.bucketId },
          data: {
            balance: { increment: split.amountNaira },
          },
        });
      }
    }

    await tx.ledgerEvent.create({
      data: {
        merchantId: input.merchantId,
        type: 'TRANSACTION_SPLIT',
        payload: {
          transactionId: transaction.id,
          amountNaira: amount.toFixed(2),
          source: input.source ?? 'MANUAL',
          splits: computedSplits,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      transactionId: transaction.id,
      merchantId: input.merchantId,
      amountNaira: amount.toFixed(2),
      splits: computedSplits,
      splitIds: splits.map((s) => s.id),
    };
  });

  const bucketMap = new Map(buckets.map((b) => [b.id, b]));

  const enrichedSplits = computedSplits.map((split) => {
    if (!split.bucketId) {
      return {
        bucketId: null,
        bucketName: 'Operating',
        bucketType: 'CUSTOM' as const,
        amountNaira: split.amountNaira,
      };
    }
    const bucket = bucketMap.get(split.bucketId);
    return {
      bucketId: split.bucketId,
      bucketName: bucket?.name ?? 'Bucket',
      bucketType: bucket?.type ?? 'CUSTOM',
      amountNaira: split.amountNaira,
    };
  });

  const rawMeta = (input.raw ?? {}) as Record<string, unknown>;

  await publishTxEvent(input.merchantId, {
    transactionId: result.transactionId,
    merchantId: result.merchantId,
    amountNaira: result.amountNaira,
    customerName: (rawMeta.customerName as string) ?? 'Customer Payment',
    channel: (rawMeta.channel as string) ?? 'transfer',
    splits: enrichedSplits,
    receivedAt: now.toISOString(),
  });

  return {
    transactionId: result.transactionId,
    merchantId: result.merchantId,
    amountNaira: result.amountNaira,
    splits: result.splits,
  };
}
