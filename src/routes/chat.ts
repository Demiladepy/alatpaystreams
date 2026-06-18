import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import {
  createConversation,
  getConversationForMerchant,
} from '../services/conversationStore';
import { handleMessage } from '../services/orchestrator';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, conversationId, message, channel } = req.body;

    if (!merchantId || !message || !channel) {
      res.status(400).json({
        error: 'merchantId, message, and channel are required',
      });
      return;
    }

    if (channel !== 'WHATSAPP' && channel !== 'DASHBOARD') {
      res.status(400).json({ error: 'channel must be WHATSAPP or DASHBOARD' });
      return;
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    let activeConversationId = conversationId as string | undefined;

    if (activeConversationId) {
      const valid = await getConversationForMerchant(activeConversationId, merchantId);
      if (!valid) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
    } else {
      activeConversationId = await createConversation(merchantId, channel);
    }

    const result = await handleMessage({
      merchantId,
      conversationId: activeConversationId,
      userMessage: String(message),
      channel,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      res.status(503).json({ error: 'AI co-pilot is not configured' });
      return;
    }
    next(error);
  }
});

export default router;
