import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { applySplit } from '../services/applySplit';
import {
  alatpayService,
  claimWebhook,
  extractEmbeddedSignature,
  extractSignatureFromHeaders,
  releaseWebhookClaim,
} from '../integrations/alatpay';

const router = Router();

async function handleAlatpayWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

    const headerSignature = extractSignatureFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );
    const signature = headerSignature || extractEmbeddedSignature(rawBody);

    if (!alatpayService.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse(rawBody);
    const parsed = alatpayService.parseWebhook(payload);

    if (parsed.eventType !== 'transaction.received') {
      res.status(200).json({ status: 'ignored', event: parsed.eventType });
      return;
    }

    const isNew = await claimWebhook(parsed.transactionId);
    if (!isNew) {
      res.status(200).json({ status: 'duplicate' });
      return;
    }

    const merchant = await prisma.merchant.findFirst({
      where: { alatpayAccountId: parsed.merchantAccountId },
    });

    if (!merchant) {
      await releaseWebhookClaim(parsed.transactionId);
      logger.warn({ accountId: parsed.merchantAccountId }, 'Webhook merchant not found');
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    try {
      await applySplit({
        merchantId: merchant.id,
        amountNaira: parsed.amountNaira.toFixed(2),
        source: 'CUSTOMER_PAYMENT',
        externalRef: parsed.transactionId,
        raw: {
          customerName: parsed.customerName,
          customerPhone: parsed.customerPhone,
          channel: parsed.channel,
          reference: parsed.reference,
        },
        now: parsed.receivedAt,
      });

      res.status(200).json({ status: 'processed' });
    } catch (error) {
      await releaseWebhookClaim(parsed.transactionId);
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

router.post('/', handleAlatpayWebhook);
router.post('/alatpay', handleAlatpayWebhook);

export default router;
