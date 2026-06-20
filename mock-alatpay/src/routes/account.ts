import { Router, Request, Response, NextFunction } from 'express';
import { getMerchant } from '../services/storage';
import type { AccountResponse } from '../types';

const router = Router();

router.get('/:merchantAccountId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchant = await getMerchant(String(req.params.merchantAccountId));
    if (!merchant) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const response: AccountResponse = {
      accountId: merchant.id,
      accountName: merchant.accountName,
      balanceNaira: merchant.balanceNaira,
      status: merchant.status,
      bankCode: merchant.bankCode ?? 'GTB',
      bankName: merchant.bankName ?? 'GTBank',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
