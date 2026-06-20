import { Router, Request, Response, NextFunction } from 'express';
import { applySplit } from '../services/applySplit';
import { parseBody, simulateTransactionSchema } from '../lib/validation';
import Decimal from 'decimal.js';

const router = Router();

router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parseBody(simulateTransactionSchema, req.body);
    if (!parsed.success) {
      res.status(400).json(parsed.error);
      return;
    }

    const { merchantId, amountNaira } = parsed.data;
    const amount =
      typeof amountNaira === 'string' ? amountNaira : new Decimal(amountNaira).toFixed(2);

    const result = await applySplit({
      merchantId,
      amountNaira: amount,
      source: 'MANUAL',
      raw: { simulated: true },
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
