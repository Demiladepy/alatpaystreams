import { Router, Request, Response, NextFunction } from 'express';
import { runPaymentBurst } from '../services/simulator';
import {
  removeTransactionsSince,
  setMerchantBalance,
} from '../services/storage';
import { DEMO_MERCHANT_ID } from '../types';

const router = Router();
const INITIAL_BALANCE = 145_000;

router.post('/burst', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantAccountId = req.body?.merchantAccountId ?? DEMO_MERCHANT_ID;
    const count = req.body?.count ?? 5;
    const durationMs = req.body?.durationMs ?? 30_000;

    void runPaymentBurst(merchantAccountId, count, durationMs);

    res.json({
      status: 'started',
      merchantAccountId,
      paymentsScheduled: count,
      durationMs,
      message: `${count} customer payments will fire over ${durationMs / 1000}s`,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantAccountId = req.body?.merchantAccountId ?? DEMO_MERCHANT_ID;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await setMerchantBalance(merchantAccountId, INITIAL_BALANCE);
    const removed = await removeTransactionsSince(todayStart.toISOString());

    res.json({
      status: 'reset',
      merchantAccountId,
      balanceNaira: INITIAL_BALANCE,
      transactionsRemoved: removed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
