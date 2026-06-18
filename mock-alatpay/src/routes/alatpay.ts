import { Router, Request, Response, NextFunction } from 'express';
import { simulateCustomerPayment } from '../services/simulator';
import { getMerchant } from '../services/storage';
import { DEMO_MERCHANT_ID } from '../types';

const router = Router();

router.post(
  '/simulate-customer-payment',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { merchantAccountId, amountNaira, customerName } = req.body;

      if (!merchantAccountId || amountNaira === undefined) {
        res.status(400).json({
          error: 'merchantAccountId and amountNaira are required',
        });
        return;
      }

      if (amountNaira <= 0) {
        res.status(400).json({ error: 'amountNaira must be positive' });
        return;
      }

      const merchant = await getMerchant(merchantAccountId);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      const tx = await simulateCustomerPayment({
        merchantAccountId,
        amountNaira,
        customerName,
      });

      res.status(201).json({
        status: 'accepted',
        transactionId: tx.transactionId,
        amountNaira: tx.amountNaira,
        timestamp: tx.timestamp,
        webhookQueued: true,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

export { DEMO_MERCHANT_ID };
