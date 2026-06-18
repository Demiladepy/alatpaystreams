import { logger } from '../../lib/logger';

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

export async function transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/ogg'): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for voice transcription');
  }

  const ext = mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('mp4') ? 'm4a' : 'ogg';
  const blob = new Blob([audioBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, `voice.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'Whisper transcription failed');
    throw new Error(`Transcription failed: ${err}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
}

export async function transcribeVoiceNote(mediaId: string, mimeType?: string): Promise<string> {
  const buffer = await downloadWhatsAppMedia(mediaId);
  return transcribeAudio(buffer, mimeType ?? 'audio/ogg');
}
