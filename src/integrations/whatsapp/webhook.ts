import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';
import { extractMessagesFromPayload } from './messageParser';
import { enqueueWhatsAppMessage } from './queue';
import { verifyWhatsAppSignature } from './signatureVerify';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(String(challenge));
    return;
  }

  res.status(403).send('Forbidden');
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody =
      req.body instanceof Buffer
        ? req.body
        : Buffer.from(
            typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
          );

    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    res.status(200).json({ status: 'received' });

    try {
      const payload = JSON.parse(rawBody.toString('utf8'));
      const messages = extractMessagesFromPayload(payload);

      for (const message of messages) {
        await enqueueWhatsAppMessage({ message });
      }
    } catch (enqueueErr) {
      logger.error({ err: enqueueErr }, 'Failed to enqueue WhatsApp messages');
    }
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      logger.error({ err: error }, 'WhatsApp webhook error after response sent');
    }
  }
});

export default router;
