import express, { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import accountRouter from './routes/account';
import alatpayRouter from './routes/alatpay';
import demoRouter from './routes/demo';
import payoutRouter from './routes/payout';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();
const port = parseInt(process.env.PORT ?? '5500', 10);

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mock-alatpay' });
});

app.use('/alatpay/account', accountRouter);
app.use('/alatpay/payout', payoutRouter);
app.use('/alatpay', alatpayRouter);
app.use('/demo', demoRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');

  if (err.message === 'MERCHANT_NOT_FOUND') {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  logger.info(
    {
      port,
      webhookUrl: process.env.WEBHOOK_URL ?? '(not set)',
    },
    'Mock ALATPay listening',
  );
});

export default app;
