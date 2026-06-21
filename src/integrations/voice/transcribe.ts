import { logger } from '../../lib/logger';
import {
  isYarnGptConfigured,
  transcribeWithYarnGpt,
  type YarnGptLanguage,
} from '../yarngpt/client';

export type VoiceProvider = 'yarngpt' | 'whisper';

export interface VoiceTranscriptionResult {
  text: string;
  provider: VoiceProvider;
  language?: string;
  confidence?: number;
}

function voiceProvider(): VoiceProvider {
  const configured = (process.env.VOICE_PROVIDER ?? 'yarngpt').toLowerCase();
  if (configured === 'whisper') return 'whisper';
  return 'yarngpt';
}

function voiceLanguage(): YarnGptLanguage {
  const lang = (process.env.VOICE_LANGUAGE ?? 'auto').toLowerCase();
  if (lang === 'english' || lang === 'yoruba' || lang === 'igbo' || lang === 'hausa') {
    return lang;
  }
  return 'auto';
}

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<VoiceTranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for Whisper fallback');
  }

  const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), `voice.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'Whisper transcription failed');
    throw new Error(`Whisper transcription failed: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text?: string };
  return {
    text: (data.text ?? '').trim(),
    provider: 'whisper',
    language: 'english',
  };
}

/**
 * Streams Voice — YarnGPT first for Nigerian local context (English, Pidgin, Yoruba, Igbo, Hausa).
 * Whisper is optional dev fallback when VOICE_PROVIDER=whisper or VOICE_WHISPER_FALLBACK=true.
 */
export async function transcribeVoiceAudio(
  audioBuffer: Buffer,
  mimeType = 'audio/webm',
): Promise<VoiceTranscriptionResult> {
  const provider = voiceProvider();
  const language = voiceLanguage();

  if (provider === 'whisper') {
    return transcribeWithWhisper(audioBuffer, mimeType);
  }

  if (!isYarnGptConfigured()) {
    if (process.env.VOICE_WHISPER_FALLBACK === 'true' && process.env.OPENAI_API_KEY) {
      logger.warn('YarnGPT not configured — using Whisper fallback');
      return transcribeWithWhisper(audioBuffer, mimeType);
    }
    throw new Error('YARNGPT_API_KEY is not configured for Streams Voice');
  }

  try {
    const result = await transcribeWithYarnGpt(audioBuffer, mimeType, language);
    return {
      text: result.text,
      provider: 'yarngpt',
      language: result.language ?? language,
      confidence: result.confidence,
    };
  } catch (err) {
    if (process.env.VOICE_WHISPER_FALLBACK === 'true' && process.env.OPENAI_API_KEY) {
      logger.warn({ err }, 'YarnGPT failed — falling back to Whisper');
      return transcribeWithWhisper(audioBuffer, mimeType);
    }
    throw err;
  }
}

/** Prefix for orchestrator when input came from voice. */
export function formatVoiceUserMessage(
  transcript: string,
  meta: { provider: VoiceProvider; language?: string },
): string {
  const lang = meta.language && meta.language !== 'auto' ? meta.language : 'Nigerian English';
  return `${transcript}\n\n(User spoke via Streams Voice / YarnGPT — ${lang}. Transcript above is verbatim.)`;
}
