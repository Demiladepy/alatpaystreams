import { Router, Request, Response, NextFunction } from 'express';
import {
  appendTransaction,
  getMerchant,
  updateMerchantBalance,
} from '../services/storage';
import {
  generateReference,
  generateTransactionId,
  randomNigerianPhone,
  sendPayoutSettledWebhook,
  shouldPayoutBePending,
  simulateNetworkDelay,
} from './webhooks';
import type { PayoutRequest, PayoutResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as PayoutRequest;
    const { merchantAccountId, amountNaira, narration, reference } = body;

    if (!merchantAccountId || !amountNaira || !reference) {
      res.status(400).json({
        error: 'merchantAccountId, amountNaira, and reference are required',
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

    if (merchant.balanceNaira < amountNaira) {
      res.status(400).json({
        error: 'Insufficient balance',
        balanceNaira: merchant.balanceNaira,
      });
      return;
    }

    await simulateNetworkDelay();

    const transactionId = generateTransactionId();
    const timestamp = new Date().toISOString();
    const isPending = shouldPayoutBePending();

    const webhookData = {
      transactionId,
      merchantAccountId,
      amountNaira: -amountNaira,
      customerName: merchant.accountName,
      customerPhone: merchant.phone,
      channel: 'transfer' as const,
      reference,
    };

    if (isPending) {
      const response: PayoutResponse = {
        status: 'pending',
        transactionId,
        amount: amountNaira,
        timestamp,
        balanceAfter: merchant.balanceNaira,
      };
      res.json(response);

      setTimeout(async () => {
        try {
          const updated = await updateMerchantBalance(merchantAccountId, -amountNaira);
          await appendTransaction({
            transactionId,
            merchantAccountId,
            amountNaira: -amountNaira,
            customerName: merchant.accountName,
            customerPhone: merchant.phone,
            channel: 'transfer',
            reference,
            timestamp: new Date().toISOString(),
            type: 'payout',
            status: 'successful',
            narration,
          });
          await sendPayoutSettledWebhook({
            ...webhookData,
            amountNaira: amountNaira,
          });
          console.log(`[payout] Settled pending ${transactionId}, balance: ${updated.balanceNaira}`);
        } catch (err) {
          console.error('[payout] Pending settlement failed:', err);
        }
      }, 2000);

      return;
    }

    const updated = await updateMerchantBalance(merchantAccountId, -amountNaira);
    await appendTransaction({
      transactionId,
      merchantAccountId,
      amountNaira: -amountNaira,
      customerName: merchant.accountName,
      customerPhone: merchant.phone,
      channel: 'transfer',
      reference,
      timestamp,
      type: 'payout',
      status: 'successful',
      narration,
    });

    const response: PayoutResponse = {
      status: 'successful',
      transactionId,
      amount: amountNaira,
      timestamp,
      balanceAfter: updated.balanceNaira,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
