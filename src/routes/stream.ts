import { Router, Request, Response } from 'express';
import { logger } from '../lib/logger';
import { createRedisSubscriber } from '../lib/redisSubscriber';

const router = Router();

router.get('/:id/stream', (req: Request, res: Response) => {
  const merchantId = String(req.params.id);
  const origin = process.env.CORS_ORIGIN ?? '*';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const subscriber = createRedisSubscriber();
  const channel = `tx:${merchantId}`;

  subscriber.subscribe(channel, (err) => {
    if (err) {
      logger.error({ err, merchantId }, 'SSE subscribe failed');
      res.end();
    }
  });

  subscriber.on('message', (_ch, message) => {
    res.write(`data: ${message}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe(channel).catch(() => undefined);
    subscriber.quit().catch(() => undefined);
  });

  logger.info({ merchantId }, 'SSE client connected');
});

export default router;
