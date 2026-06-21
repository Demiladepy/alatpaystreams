import nock from 'nock';
import { transcribeVoiceNote } from '../src/integrations/whatsapp/mediaHandler';

describe('WhatsApp voice note pipeline', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'wa-token',
      YARNGPT_API_KEY: 'yarngpt-key',
      VOICE_PROVIDER: 'yarngpt',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    nock.cleanAll();
  });

  it('downloads media and transcribes via YarnGPT', async () => {
    nock('https://graph.facebook.com')
      .get('/v21.0/123')
      .reply(200, { url: 'https://cdn.example.com/voice.ogg' });

    nock('https://cdn.example.com')
      .get('/voice.ogg')
      .reply(200, Buffer.from('fake-audio'));

    nock('https://yarngpt.ai')
      .post('/api/v1/transcribe')
      .reply(200, { text: 'Set aside 7.5% for VAT', language: 'english' });

    const text = await transcribeVoiceNote('123', 'audio/ogg');
    expect(text).toBe('Set aside 7.5% for VAT');
  });
});
