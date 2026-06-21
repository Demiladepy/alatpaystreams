import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { logger } from '../../lib/logger';
import { redis } from '../../lib/redis';
import { handleMessage } from '../../services/orchestrator';
import { downloadWhatsAppMedia } from './mediaHandler';
import {
  formatVoiceUserMessage,
  transcribeVoiceAudio,
} from '../voice/transcribe';
import {
  findOrCreateMerchantByPhone,
  getOrCreateWhatsAppConversation,
} from './merchantLookup';
import {
  inboundMessageToOrchestratorText,
  isVoiceMessage,
} from './messageParser';
import { sendAssistantResponse } from './responseAdapter';
import type { WhatsAppJobData } from './types';

const QUEUE_NAME = 'whatsapp-messages';

function getConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue<WhatsAppJobData> | null = null;
let worker: Worker<WhatsAppJobData> | null = null;

export function getWhatsAppQueue(): Queue<WhatsAppJobData> {
  if (!queue) {
    queue = new Queue<WhatsAppJobData>(QUEUE_NAME, { connection: getConnection() });
  }
  return queue;
}

async function claimMessage(messageId: string): Promise<boolean> {
  const result = await redis.set(`wa:msg:${messageId}`, '1', 'EX', 86400, 'NX');
  return result === 'OK';
}

async function resolveUserText(message: WhatsAppJobData['message']): Promise<string> {
  if (isVoiceMessage(message)) {
    const buffer = await downloadWhatsAppMedia(message.audio.id);
    const result = await transcribeVoiceAudio(
      buffer,
      message.audio.mime_type ?? 'audio/ogg',
    );
    if (!result.text) {
      return '(User sent a voice note but transcription was empty.)';
    }
    return formatVoiceUserMessage(result.text, {
      provider: result.provider,
      language: result.language,
    });
  }

  return inboundMessageToOrchestratorText(message);
}

export async function processWhatsAppMessage(data: WhatsAppJobData): Promise<void> {
  const { message } = data;

  const claimed = await claimMessage(message.id);
  if (!claimed) {
    logger.info({ messageId: message.id }, 'Duplicate WhatsApp message skipped');
    return;
  }

  const merchant = await findOrCreateMerchantByPhone(message.from);
  const conversationId = await getOrCreateWhatsAppConversation(merchant.id);

  let userText: string;
  try {
    userText = await resolveUserText(message);
  } catch (err) {
    logger.error({ err, messageId: message.id }, 'Failed to resolve WhatsApp message');
    await sendAssistantResponse(
      message.from,
      {
        type: 'text',
        body: "I couldn't process that voice note. Try again or type your message.",
      },
    );
    return;
  }

  if (!userText.trim()) {
    await sendAssistantResponse(message.from, {
      type: 'text',
      body: "I didn't catch that. Send text or try the voice note again.",
    });
    return;
  }

  const result = await handleMessage({
    merchantId: merchant.id,
    conversationId,
    userMessage: userText,
    channel: 'WHATSAPP',
  });

  await sendAssistantResponse(message.from, result.response);
}

export function startWhatsAppWorker(): Worker<WhatsAppJobData> {
  if (worker) {
    return worker;
  }

  worker = new Worker<WhatsAppJobData>(
    QUEUE_NAME,
    async (job) => {
      await processWhatsAppMessage(job.data);
    },
    { connection: getConnection() },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'WhatsApp job failed');
  });

  logger.info('WhatsApp BullMQ worker started');
  return worker;
}

export async function enqueueWhatsAppMessage(data: WhatsAppJobData): Promise<void> {
  await getWhatsAppQueue().add('incoming', data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function closeWhatsAppQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}
