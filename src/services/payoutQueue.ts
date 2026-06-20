import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import Decimal from 'decimal.js';
import { logger } from '../lib/logger';
import { alatpayService } from '../integrations/alatpay';
import type { PayoutInput } from '../integrations/alatpay/types';

const QUEUE_NAME = 'deferred-payouts';

function getConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue<PayoutInput & { bankCode?: string }> | null = null;
let worker: Worker<PayoutInput & { bankCode?: string }> | null = null;

export function getPayoutQueue(): Queue<PayoutInput & { bankCode?: string }> {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  }
  return queue;
}

export async function enqueueDeferredPayout(
  input: PayoutInput & { bankCode?: string },
): Promise<void> {
  await getPayoutQueue().add('payout', input, {
    delay: 3 * 60 * 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  });
}

export function startPayoutWorker(): void {
  if (worker) return;

  worker = new Worker<PayoutInput & { bankCode?: string }>(
    QUEUE_NAME,
    async (job) => {
      const { bankCode: _bankCode, ...input } = job.data;
      await alatpayService.payout({
        ...input,
        amountNaira: new Decimal(input.amountNaira.toString()),
      });
    },
    { connection: getConnection() },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Deferred payout failed');
  });
}
