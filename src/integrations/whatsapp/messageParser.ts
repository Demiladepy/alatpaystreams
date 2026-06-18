import type { WhatsAppInboundMessage } from './types';

export function extractMessagesFromPayload(payload: unknown): WhatsAppInboundMessage[] {
  const body = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: { messages?: WhatsAppInboundMessage[] };
      }>;
    }>;
  };

  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        messages.push(message);
      }
    }
  }

  return messages;
}

export function inboundMessageToOrchestratorText(message: WhatsAppInboundMessage): string {
  switch (message.type) {
    case 'text':
      return message.text.body;

    case 'interactive':
      if (message.interactive.type === 'button_reply') {
        const { id, title } = message.interactive.button_reply;
        return formatButtonReply(id, title);
      }
      if (message.interactive.type === 'list_reply') {
        const { id, title } = message.interactive.list_reply;
        if (id.startsWith('bucket_')) {
          return `User selected bucket type "${title}" (${id}) from setup list. Help them configure it with create_bucket.`;
        }
        return `User selected from list: "${title}" (id: ${id})`;
      }
      return 'User sent an interactive reply.';

    case 'audio':
      return '';

    default:
      return 'User sent an unsupported message type.';
  }
}

function formatButtonReply(id: string, title: string): string {
  if (id.startsWith('accept_loan:')) {
    const offerId = id.slice('accept_loan:'.length);
    return `User clicked Accept on loan offer ${offerId}. Please call accept_loan with offerId ${offerId}.`;
  }
  if (id.startsWith('decline_loan:')) {
    const offerId = id.slice('decline_loan:'.length);
    return `User clicked Decline on loan offer ${offerId}. Acknowledge politely — no accept_loan call.`;
  }
  if (id.startsWith('loan_info:') || id.startsWith('info_loan:')) {
    const offerId = id.replace(/^(loan_info|info_loan):/, '');
    return `User clicked More info on loan offer ${offerId}. Explain terms clearly without calling accept_loan.`;
  }
  if (id === 'decline_loan') {
    return 'User clicked Decline on the loan offer. Acknowledge politely.';
  }

  return `User clicked button: "${title}" (id: ${id})`;
}

export function isVoiceMessage(message: WhatsAppInboundMessage): message is Extract<
  WhatsAppInboundMessage,
  { type: 'audio' }
> {
  return message.type === 'audio';
}
