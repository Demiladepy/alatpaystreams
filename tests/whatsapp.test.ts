import crypto from 'crypto';
import nock from 'nock';
import { verifyWhatsAppSignature } from '../src/integrations/whatsapp/signatureVerify';
import {
  extractMessagesFromPayload,
  inboundMessageToOrchestratorText,
} from '../src/integrations/whatsapp/messageParser';
import { buildAssistantResponse } from '../src/services/responseBuilder';
import { whatsappClient } from '../src/integrations/whatsapp/client';

describe('WhatsApp signature verification', () => {
  const secret = 'test-app-secret';

  it('accepts valid sha256 signature', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig =
      'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

    expect(verifyWhatsAppSignature(body, sig, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(
      verifyWhatsAppSignature('{}', 'sha256=deadbeef', secret),
    ).toBe(false);
  });
});

describe('WhatsApp message parsing', () => {
  it('extracts nested messages from Meta payload', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '2348012345678',
                    id: 'wamid.abc',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = extractMessagesFromPayload(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('text');
  });

  it('maps accept_loan button to orchestrator text', () => {
    const text = inboundMessageToOrchestratorText({
      from: '2348012345678',
      id: 'wamid.btn',
      timestamp: '1',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'accept_loan:loan123', title: 'Accept' },
      },
    });

    expect(text).toContain('accept_loan');
    expect(text).toContain('loan123');
  });
});

describe('AssistantResponse builder', () => {
  it('builds buttons after make_offer', () => {
    const response = buildAssistantResponse({
      assistantText: 'You qualify for ₦400,000.',
      toolsCalled: ['check_eligibility', 'make_offer'],
      toolOutputs: { make_offer: { offerId: 'loan_xyz' } },
    });

    expect(response.type).toBe('buttons');
    if (response.type === 'buttons') {
      expect(response.buttons).toHaveLength(3);
      expect(response.buttons[0].id).toBe('accept_loan:loan_xyz');
    }
  });

  it('builds list for bucket setup intent', () => {
    const response = buildAssistantResponse({
      assistantText: 'Let’s set up your buckets.',
      toolsCalled: [],
      toolOutputs: {},
      userMessage: 'Help me set up my buckets',
    });

    expect(response.type).toBe('list');
  });
});

describe('WhatsApp client', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('sendText posts to Graph API', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';

    const scope = nock('https://graph.facebook.com')
      .post(/\/v21\.0\/123456\/messages/)
      .reply(200, { messages: [{ id: 'wamid.out' }] });

    const result = await whatsappClient.sendText('2348012345678', 'Hello Funke');
    expect(result.messageId).toBe('wamid.out');
    expect(scope.isDone()).toBe(true);

    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });
});
