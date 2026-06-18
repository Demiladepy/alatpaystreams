import { Prisma } from '@prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import type { CreateBucketInput } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, name, type, rule, priority, isActive } =
      req.body as CreateBucketInput;

    if (!merchantId || !name || !type || !rule || priority === undefined) {
      res.status(400).json({
        error: 'merchantId, name, type, rule, and priority are required',
      });
      return;
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
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
