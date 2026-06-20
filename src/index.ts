import express, { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { logALATPayStartupMode } from './integrations/alatpay';
import merchantsRouter from './routes/merchants';
import streamRouter from './routes/stream';
import bucketsRouter from './routes/buckets';
import transactionsRouter from './routes/transactions';
import chatRouter from './routes/chat';
import webhooksRouter from './routes/webhooks';
import alatpayHealthRouter from './routes/alatpayHealth';
import uptimeRouter from './routes/uptime';
import { startWhatsAppWorker, whatsappWebhookRouter } from './integrations/whatsapp';
import { seedUptimeMonitor } from './services/uptimeMonitor';
import { startPayoutWorker } from './services/payoutQueue';

const app = express();
const port = parseInt(process.env.PORT ?? '3000', 10);

logALATPayStartupMode();

void seedUptimeMonitor();

app.use(
  '/webhooks/alatpay',
  express.raw({ type: 'application/json' }),
  webhooksRouter,
);

app.use(
  '/webhooks/whatsapp',
  express.raw({ type: 'application/json' }),
  whatsappWebhookRouter,
);

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/merchants', merchantsRouter);
app.use('/api/merchants', streamRouter);
app.use('/api/buckets', bucketsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/uptime', uptimeRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/alatpay', alatpayHealthRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');

  if (err.message.includes('No active buckets')) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err.name === 'ALATPayCircuitOpenError') {
    res.status(503).json({ error: err.message, code: 'ALATPAY_CIRCUIT_OPEN' });
    return;
  }

  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  startWhatsAppWorker();
  startPayoutWorker();
}

app.listen(port, () => {
  logger.info({ port }, 'ALATPay Streams API listening');
});

export default app;
