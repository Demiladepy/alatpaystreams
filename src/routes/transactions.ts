import { Router, Request, Response, NextFunction } from 'express';
import { applySplit } from '../services/applySplit';

const router = Router();

router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, amountNaira } = req.body;

    if (!merchantId || amountNaira === undefined || amountNaira === null) {
      res.status(400).json({ error: 'merchantId and amountNaira are required' });
      return;
    }

    const result = await applySplit({
      merchantId,
      amountNaira,
      source: 'MANUAL',
      raw: { simulated: true },
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
