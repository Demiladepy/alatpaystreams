import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/db';
import {
  createConversation,
  getConversationForMerchant,
} from '../services/conversationStore';
import { transcribeAudio } from '../integrations/whatsapp/mediaHandler';
import { handleMessage } from '../services/orchestrator';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

router.post(
  '/voice',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchantId = req.body.merchantId as string | undefined;
      const conversationId = req.body.conversationId as string | undefined;
      const channel = (req.body.channel as string | undefined) ?? 'DASHBOARD';

      if (!merchantId || !req.file) {
        res.status(400).json({ error: 'merchantId and audio file are required' });
        return;
      }

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      let activeConversationId = conversationId;
      if (activeConversationId) {
        const valid = await getConversationForMerchant(activeConversationId, merchantId);
        if (!valid) {
          res.status(404).json({ error: 'Conversation not found' });
          return;
        }
      } else {
        activeConversationId = await createConversation(merchantId, 'DASHBOARD');
      }

      const mimeType = req.file.mimetype || 'audio/webm';
      const transcript = await transcribeAudio(req.file.buffer, mimeType);

      if (!transcript.trim()) {
        res.status(400).json({ error: 'Could not transcribe audio — try again.' });
        return;
      }

      const result = await handleMessage({
        merchantId,
        conversationId: activeConversationId,
        userMessage: `${transcript}\n\n(User sent via voice)`,
        channel: channel === 'WHATSAPP' ? 'WHATSAPP' : 'DASHBOARD',
      });

      res.json({ ...result, transcript });
    } catch (error) {
      if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
        res.status(503).json({ error: 'Voice transcription is not configured' });
        return;
      }
      if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
        res.status(503).json({ error: 'AI co-pilot is not configured' });
        return;
      }
      next(error);
    }
  },
);

export default router;
