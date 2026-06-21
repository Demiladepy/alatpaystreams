import { logger } from '../../lib/logger';

export type YarnGptLanguage = 'english' | 'yoruba' | 'igbo' | 'hausa' | 'auto';

export interface YarnGptTranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
}

function getApiKey(): string {
  const key = process.env.YARNGPT_API_KEY?.trim();
  if (!key) {
    throw new Error('YARNGPT_API_KEY is not configured for Streams Voice');
  }
  return key;
}

function baseUrl(): string {
  return (process.env.YARNGPT_BASE_URL ?? 'https://yarngpt.ai').replace(/\/$/, '');
}

function sttPath(): string {
  return process.env.YARNGPT_STT_PATH ?? '/api/v1/transcribe';
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

/**
 * Transcribe audio via YarnGPT — Nigerian English, Pidgin, Yoruba, Igbo, Hausa.
 * @see https://yarngpt.ai/api-docs
 */
export async function transcribeWithYarnGpt(
  audioBuffer: Buffer,
  mimeType: string,
  language: YarnGptLanguage = 'auto',
): Promise<YarnGptTranscriptionResult> {
  const apiKey = getApiKey();
  const url = `${baseUrl()}${sttPath()}`;
  const ext = extensionForMime(mimeType);

  const form = new FormData();
  form.append('audio', new Blob([audioBuffer], { type: mimeType }), `voice.${ext}`);
  form.append('language', language);

  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error(
      { status: res.status, err, url, latencyMs: Date.now() - started },
      'YarnGPT transcription failed',
    );
    throw new Error(`YarnGPT transcription failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    text?: string;
    transcript?: string;
    language?: string;
    confidence?: number;
  };

  const text = (data.text ?? data.transcript ?? '').trim();
  logger.info(
    { language: data.language ?? language, latencyMs: Date.now() - started },
    'YarnGPT transcription complete',
  );

  return {
    text,
    language: data.language,
    confidence: data.confidence,
  };
}

export interface YarnGptTtsOptions {
  text: string;
  voice?: string;
  responseFormat?: 'mp3' | 'wav' | 'opus' | 'flac';
}

/** Nigerian-accent TTS — for spoken co-pilot replies (optional). */
export async function synthesizeWithYarnGpt(
  options: YarnGptTtsOptions,
): Promise<Buffer> {
  const apiKey = getApiKey();
  const url = `${baseUrl()}/api/v1/tts`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: options.text.slice(0, 2000),
      voice: options.voice ?? process.env.YARNGPT_VOICE ?? 'Idera',
      response_format: options.responseFormat ?? 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YarnGPT TTS failed (${res.status}): ${err.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export function isYarnGptConfigured(): boolean {
  return Boolean(process.env.YARNGPT_API_KEY?.trim());
}
