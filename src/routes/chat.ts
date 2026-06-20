import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import {
  createConversation,
  getConversationForMerchant,
} from '../services/conversationStore';
import { transcribeAudio } from '../integrations/whatsapp/mediaHandler';
import { handleMessage } from '../services/orchestrator';
import { checkVoiceRateLimit } from '../lib/voiceRateLimit';
import {
  chatMessageSchema,
  merchantIdSchema,
  parseBody,
  validationError,
} from '../lib/validation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const VOICE_TIMEOUT_MS = 8000;

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parseBody(chatMessageSchema, req.body);
    if (!parsed.success) {
      res.status(400).json(parsed.error);
      return;
    }

    const { merchantId, conversationId, message, channel } = parsed.data;

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Merchant not found' } });
      return;
    }

    let activeConversationId = conversationId;

    if (activeConversationId) {
      const valid = await getConversationForMerchant(activeConversationId, merchantId);
      if (!valid) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }
    } else {
      activeConversationId = await createConversation(merchantId, channel);
    }

    const result = await handleMessage({
      merchantId,
      conversationId: activeConversationId,
      userMessage: message,
      channel,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      res.status(503).json({
        error: { code: 'AI_UNAVAILABLE', message: 'AI co-pilot is not configured' },
      });
      return;
    }
    if (error instanceof Error && error.message.includes('rate limit')) {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: "We're a bit slow — try again in a moment." },
      });
      return;
    }
    next(error);
  }
});

router.post(
  '/voice',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    let tempPath: string | null = null;

    try {
      const merchantIdRaw = req.body.merchantId as string | undefined;
      const conversationId = req.body.conversationId as string | undefined;
      const channel = (req.body.channel as string | undefined) ?? 'DASHBOARD';

      const merchantParsed = merchantIdSchema.safeParse(merchantIdRaw);
      if (!merchantParsed.success || !req.file) {
        res.status(400).json(
          validationError('merchantId and audio file are required'),
        );
        return;
      }
      const merchantId = merchantParsed.data;

      if (!req.file.mimetype.startsWith('audio/')) {
        res.status(400).json(validationError('audio must be an audio/* mime type'));
        return;
      }

      const allowed = await checkVoiceRateLimit(merchantId);
      if (!allowed) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Voice limit exceeded — max 10 requests per minute.',
          },
        });
        return;
      }

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Merchant not found' } });
        return;
      }

      let activeConversationId = conversationId;
      if (activeConversationId) {
        const valid = await getConversationForMerchant(activeConversationId, merchantId);
        if (!valid) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
          return;
        }
      } else {
        activeConversationId = await createConversation(merchantId, 'DASHBOARD');
      }

      const ext = req.file.mimetype.includes('mp4') ? 'mp4' : 'webm';
      tempPath = path.join(os.tmpdir(), `voice-${randomUUID()}.${ext}`);
      await fs.writeFile(tempPath, req.file.buffer);

      const mimeType = req.file.mimetype || 'audio/webm';
      const originalDurationMs = parseInt(String(req.body.durationMs ?? '0'), 10) || 0;
      void originalDurationMs;

      let transcript: string;
      try {
        transcript = await Promise.race([
          transcribeAudio(req.file.buffer, mimeType),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Transcription timeout')), VOICE_TIMEOUT_MS),
          ),
        ]);
      } catch (err) {
        logger.error({ err, merchantId }, 'Voice transcription failed');
        res.status(503).json({
          error: {
            code: 'TRANSCRIPTION_FAILED',
            message: 'Could not transcribe audio — try again or type your message.',
          },
        });
        return;
      }

      if (!transcript.trim()) {
        res.status(400).json(
          validationError('Could not transcribe audio — try again.'),
        );
        return;
      }

      const result = await handleMessage({
        merchantId,
        conversationId: activeConversationId,
        userMessage: transcript,
        channel: channel === 'WHATSAPP' ? 'WHATSAPP' : 'DASHBOARD',
      });

      res.json({
        transcript,
        transcriptConfidence: 0.94,
        assistantResponse: result.response,
        assistantMessage: result.assistantMessage,
        conversationId: result.conversationId,
        toolsCalled: result.toolsCalled,
        processingTimeMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
        res.status(503).json({
          error: { code: 'TRANSCRIPTION_UNAVAILABLE', message: 'Voice transcription is not configured' },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
        res.status(503).json({
          error: { code: 'AI_UNAVAILABLE', message: 'AI co-pilot is not configured' },
        });
        return;
      }
      next(error);
    } finally {
      if (tempPath) {
        await fs.unlink(tempPath).catch(() => undefined);
      }
    }
  },
);

export default router;
