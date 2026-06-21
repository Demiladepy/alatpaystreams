import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { transcribeVoiceAudio } from '../integrations/voice/transcribe';
import { validationError } from '../lib/validation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const VOICE_TIMEOUT_MS = 12_000;

router.post(
  '/transcribe',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();

    try {
      if (!req.file) {
        res.status(400).json(validationError('audio file is required'));
        return;
      }

      if (!req.file.mimetype.startsWith('audio/')) {
        res.status(400).json(validationError('audio must be an audio/* mime type'));
        return;
      }

      const mimeType = req.file.mimetype || 'audio/webm';

      const result = await Promise.race([
        transcribeVoiceAudio(req.file.buffer, mimeType),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transcription timeout')), VOICE_TIMEOUT_MS),
        ),
      ]);

      if (!result.text.trim()) {
        res.status(400).json(validationError('Could not transcribe audio — try again.'));
        return;
      }

      res.json({
        transcript: result.text,
        language: result.language,
        confidence: result.confidence ?? 0.9,
        provider: result.provider,
        processingTimeMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('YARNGPT_API_KEY')) {
        res.status(503).json({
          error: {
            code: 'YARNGPT_UNAVAILABLE',
            message: 'Streams Voice requires YarnGPT — add YARNGPT_API_KEY to .env',
          },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('timeout')) {
        res.status(503).json({
          error: {
            code: 'TRANSCRIPTION_TIMEOUT',
            message: 'Transcription took too long — try a shorter clip.',
          },
        });
        return;
      }
      next(error);
    }
  },
);

export default router;
