import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { logALATPayStartupMode } from './integrations/alatpay';
import { validateEnv, logAlatpayModeBanner } from './lib/envCheck';
import { buildHealthStatus } from './lib/healthStatus';
import merchantsRouter from './routes/merchants';
import streamRouter from './routes/stream';
import bucketsRouter from './routes/buckets';
import transactionsRouter from './routes/transactions';
import chatRouter from './routes/chat';
import webhooksRouter from './routes/webhooks';
import alatpayHealthRouter from './routes/alatpayHealth';
import alatpaySdkRouter from './routes/alatpaySdk';
import voiceRouter from './routes/voice';
import uptimeRouter from './routes/uptime';
import { startWhatsAppWorker, whatsappWebhookRouter } from './integrations/whatsapp';
import { seedUptimeMonitor } from './services/uptimeMonitor';
import { startPayoutWorker } from './services/payoutQueue';

const envCheck = validateEnv();
if (!envCheck.ok && process.env.NODE_ENV !== 'test') {
  process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT ?? '3000', 10);

logALATPayStartupMode();
logAlatpayModeBanner();

void seedUptimeMonitor();

const allowedOrigins = [
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

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
app.use(
  pinoHttp({
    logger,
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
  }),
);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = await buildHealthStatus();
    res.setHeader('Content-Type', 'application/json');
    res.status(status.status === 'ok' ? 200 : 503).json(status);
  } catch (err) {
    logger.error({ err }, 'Health check failed');
    res.status(503).json({
      status: 'error',
      error: { code: 'HEALTH_CHECK_FAILED', message: 'Health check failed' },
    });
  }
});

app.use('/api/merchants', merchantsRouter);
app.use('/api/merchants', streamRouter);
app.use('/api/buckets', bucketsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/uptime', uptimeRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/alatpay', alatpayHealthRouter);
app.use('/api/alatpay', alatpaySdkRouter);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      merchantId: (req.body as { merchantId?: string })?.merchantId,
    },
    'Unhandled error',
  );

  if (err.message.includes('No active buckets')) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    return;
  }

  if (err.name === 'ALATPayCircuitOpenError') {
    res.status(503).json({
      error: { code: 'ALATPAY_CIRCUIT_OPEN', message: err.message },
    });
    return;
  }

  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
    return;
  }

  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    return;
  }

  if ((err as { code?: string }).code?.startsWith('P')) {
    res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Database temporarily unavailable' },
    });
    return;
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

if (process.env.NODE_ENV !== 'test') {
  startWhatsAppWorker();
  startPayoutWorker();
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info({ port }, 'ALATPay Streams API listening');
  });
}

export default app;
