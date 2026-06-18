export interface WhatsAppClient {
  sendText(to: string, body: string): Promise<{ messageId: string }>;
  sendButtons(
    to: string,
    opts: {
      body: string;
      buttons: { id: string; title: string }[];
    },
  ): Promise<{ messageId: string }>;
  sendList(
    to: string,
    opts: {
      body: string;
      buttonText: string;
      sections: {
        title: string;
        rows: { id: string; title: string; description?: string }[];
      }[];
    },
  ): Promise<{ messageId: string }>;
  sendTemplate(
    to: string,
    opts: {
      templateName: string;
      languageCode: string;
      components?: unknown[];
    },
  ): Promise<{ messageId: string }>;
}

export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text';
  text: { body: string };
}

export interface WhatsAppButtonReplyMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'interactive';
  interactive: {
    type: 'button_reply';
    button_reply: { id: string; title: string };
  };
}

export interface WhatsAppListReplyMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'interactive';
  interactive: {
    type: 'list_reply';
    list_reply: { id: string; title: string; description?: string };
  };
}

export interface WhatsAppAudioMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'audio';
  audio: { id: string; mime_type?: string };
}

export type WhatsAppInboundMessage =
  | WhatsAppTextMessage
  | WhatsAppButtonReplyMessage
  | WhatsAppListReplyMessage
  | WhatsAppAudioMessage;

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: WhatsAppInboundMessage[];
        statuses?: unknown[];
      };
      field?: string;
    }>;
  }>;
}

export interface WhatsAppJobData {
  message: WhatsAppInboundMessage;
  phoneNumberId?: string;
}
