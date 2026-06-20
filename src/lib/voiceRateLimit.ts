import { redis } from './redis';

const VOICE_LIMIT = 10;
const VOICE_WINDOW_SEC = 60;

export async function checkVoiceRateLimit(merchantId: string): Promise<boolean> {
  const key = `voice:rate:${merchantId}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, VOICE_WINDOW_SEC);
    }
    return count <= VOICE_LIMIT;
  } catch {
    // If Redis is down, allow request — splits still work without pub/sub
    return true;
  }
}
