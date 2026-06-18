import { logger } from '../../lib/logger';
import type { WhatsAppClient } from './types';

const GRAPH_API_VERSION = 'v21.0';

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  return { phoneNumberId, accessToken };
}

function isConfigured(): boolean {
  const { phoneNumberId, accessToken } = getConfig();
  return Boolean(phoneNumberId && accessToken);
}

async function postMessage(payload: Record<string, unknown>): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = getConfig();

  if (!phoneNumberId || !accessToken) {
    logger.warn({ payload }, 'WhatsApp not configured — message logged only');
    return { messageId: `mock-${Date.now()}` };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message: string; code?: number };
  };

  if (!res.ok) {
    logger.error({ status: res.status, body }, 'WhatsApp send failed');
    throw new Error(body.error?.message ?? `WhatsApp API error ${res.status}`);
  }

  const messageId = body.messages?.[0]?.id ?? `unknown-${Date.now()}`;
  return { messageId };
}

function normalizeRecipient(to: string): string {
  return to.replace(/\D/g, '');
}

export const whatsappClient: WhatsAppClient = {
  async sendText(to, body) {
    return postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(to),
      type: 'text',
      text: { preview_url: false, body: body.slice(0, 4096) },
    });
  },

  async sendButtons(to, opts) {
    if (opts.buttons.length > 3) {
      throw new Error('WhatsApp supports at most 3 reply buttons');
    }

    return postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: opts.body.slice(0, 1024) },
        action: {
          buttons: opts.buttons.map((b) => ({
            type: 'reply',
            reply: {
              id: b.id.slice(0, 256),
              title: b.title.slice(0, 20),
            },
          })),
        },
      },
    });
  },

  async sendList(to, opts) {
    return postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: opts.body.slice(0, 1024) },
        action: {
          button: opts.buttonText.slice(0, 20),
          sections: opts.sections.map((section) => ({
            title: section.title.slice(0, 24),
            rows: section.rows.map((row) => ({
              id: row.id.slice(0, 200),
              title: row.title.slice(0, 24),
              description: row.description?.slice(0, 72),
            })),
          })),
        },
      },
    });
  },

  async sendTemplate(to, opts) {
    return postMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(to),
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: opts.languageCode },
        components: opts.components,
      },
    });
  },
};

export function whatsappIsConfigured(): boolean {
  return isConfigured();
}
