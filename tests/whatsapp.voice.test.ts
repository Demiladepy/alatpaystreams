import nock from 'nock';
import { transcribeVoiceNote } from '../src/integrations/whatsapp/mediaHandler';

describe('WhatsApp voice note pipeline', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'wa-token',
      OPENAI_API_KEY: 'openai-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    nock.cleanAll();
  });

  it('downloads media and transcribes via Whisper', async () => {
    nock('https://graph.facebook.com')
      .get('/v21.0/123')
      .reply(200, { url: 'https://cdn.example.com/voice.ogg' });

    nock('https://cdn.example.com')
      .get('/voice.ogg')
      .reply(200, Buffer.from('fake-audio'));

    nock('https://api.openai.com')
      .post('/v1/audio/transcriptions')
      .reply(200, { text: 'Set aside 7.5% for VAT' });

    const text = await transcribeVoiceNote('123', 'audio/ogg');
    expect(text).toBe('Set aside 7.5% for VAT');
  });
});
