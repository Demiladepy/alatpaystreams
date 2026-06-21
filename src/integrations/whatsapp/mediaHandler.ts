import { logger } from '../../lib/logger';
import { transcribeVoiceAudio } from '../voice/transcribe';

const GRAPH_API_VERSION = 'v21.0';

function getAccessToken(): string | undefined {
  return process.env.WHATSAPP_ACCESS_TOKEN;
}

async function fetchMediaUrl(mediaId: string): Promise<string> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Failed to resolve media URL: ${err}`);
  }

  const meta = (await metaRes.json()) as { url?: string };
  if (!meta.url) {
    throw new Error('Media URL missing from Meta response');
  }

  return meta.url;
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
  }

  const mediaUrl = await fetchMediaUrl(mediaId);
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download media: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Transcribe via Streams Voice (YarnGPT — Nigerian local context). */
export async function transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/ogg'): Promise<string> {
  const result = await transcribeVoiceAudio(audioBuffer, mimeType);
  logger.info({ provider: result.provider, language: result.language }, 'Voice transcribed');
  return result.text;
}

export async function transcribeVoiceNote(mediaId: string, mimeType?: string): Promise<string> {
  const buffer = await downloadWhatsAppMedia(mediaId);
  return transcribeAudio(buffer, mimeType ?? 'audio/ogg');
}
