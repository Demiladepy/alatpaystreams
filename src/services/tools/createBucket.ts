import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { BucketRule } from '../../types';

export interface CreateBucketInput {
  merchantId: string;
  name: string;
  type: 'TAX' | 'SAVINGS' | 'SUPPLIER' | 'OWNER_SALARY' | 'LOAN_REPAYMENT' | 'CUSTOM';
  rule: BucketRule;
}

function parseRule(rule: unknown): BucketRule {
  const r = rule as BucketRule;
  if (!r?.kind || typeof r.value !== 'number') {
    throw new Error('Invalid bucket rule');
  }
  return r;
}

export async function createBucket(input: CreateBucketInput) {
  const rule = parseRule(input.rule);

  if (rule.kind === 'PERCENTAGE') {
    const buckets = await prisma.bucket.findMany({
      where: { merchantId: input.merchantId, isActive: true },
    });

    let totalPct = new Decimal(rule.value);
    for (const bucket of buckets) {
      const existing = parseRule(bucket.rule);
      if (existing.kind === 'PERCENTAGE') {
        totalPct = totalPct.plus(existing.value);
      }
    }

    if (totalPct.gt(100)) {
      return {
        success: false,
        error: `Total percentage buckets would be ${totalPct.toFixed(1)}% — that exceeds 100%. Adjust existing buckets first.`,
      };
    }
  }

  const maxPriority = await prisma.bucket.aggregate({
    where: { merchantId: input.merchantId },
    _max: { priority: true },
  });

  const bucket = await prisma.bucket.create({
    data: {
      merchantId: input.merchantId,
      name: input.name,
      type: input.type,
      rule: rule as unknown as Prisma.InputJsonValue,
      priority: (maxPriority._max.priority ?? 0) + 1,
      isActive: true,
    },
  });

  await prisma.ledgerEvent.create({
    data: {
      merchantId: input.merchantId,
      type: 'BUCKET_CREATED',
      payload: {
        bucketId: bucket.id,
        name: bucket.name,
        type: bucket.type,
        rule,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    success: true,
    bucketId: bucket.id,
    name: bucket.name,
    type: bucket.type,
    rule,
  };
}

export const createBucketDefinition = {
  name: 'create_bucket',
  description: 'Create a new income routing bucket for the merchant.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string' },
      name: { type: 'string' },
      type: {
        type: 'string',
        enum: ['TAX', 'SAVINGS', 'SUPPLIER', 'OWNER_SALARY', 'LOAN_REPAYMENT', 'CUSTOM'],
      },
      rule: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['PERCENTAGE', 'FIXED', 'WEEKLY_FIXED'] },
          value: { type: 'number' },
          dayOfWeek: { type: 'number', description: '0=Sunday … 6=Saturday for WEEKLY_FIXED' },
        },
        required: ['kind', 'value'],
      },
    },
    required: ['merchantId', 'name', 'type', 'rule'],
  },
};
