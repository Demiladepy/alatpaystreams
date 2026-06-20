import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import type { CreateMerchantInput } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, alatpayAccountId } = req.body as CreateMerchantInput;

    if (!name || !phone || !email) {
      res.status(400).json({ error: 'name, phone, and email are required' });
      return;
    }

    const merchant = await prisma.merchant.create({
      data: { name, phone, email, alatpayAccountId },
    });

    res.status(201).json(merchant);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/buckets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buckets = await prisma.bucket.findMany({
      where: { merchantId: String(req.params.id), isActive: true },
      orderBy: { priority: 'asc' },
    });

    res.json(buckets);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    const transactions = await prisma.transaction.findMany({
      where: { merchantId: String(req.params.id) },
      include: {
        splits: {
          include: { bucket: true },
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/loans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { merchantId: String(req.params.id) },
      orderBy: { offeredAt: 'desc' },
    });
    res.json(loans);
  } catch (error) {
    next(error);
  }
});

export default router;
