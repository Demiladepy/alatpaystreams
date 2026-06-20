import { Prisma } from '@prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { createBucketSchema, parseBody } from '../lib/validation';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parseBody(createBucketSchema, req.body);
    if (!parsed.success) {
      res.status(400).json(parsed.error);
      return;
    }

    const { merchantId, name, type, rule, priority, isActive } = parsed.data;

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Merchant not found' } });
      return;
    }

    const existing = await prisma.bucket.findMany({
      where: { merchantId, isActive: true },
      select: { rule: true },
    });

    if (rule.kind === 'PERCENTAGE') {
      let totalPct = rule.value;
      for (const b of existing) {
        const r = b.rule as { kind?: string; value?: number };
        if (r.kind === 'PERCENTAGE' && typeof r.value === 'number') {
          totalPct += r.value;
        }
      }
      if (totalPct > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Total bucket percentages cannot exceed 100%',
          },
        });
        return;
      }
    }

    const bucket = await prisma.bucket.create({
      data: {
        merchantId,
        name,
        type,
        rule: rule as unknown as Prisma.InputJsonValue,
        priority,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json(bucket);
  } catch (error) {
    next(error);
  }
});

export default router;
