import { prisma } from '../lib/db';

const OFFER_TTL_MS = 60 * 60 * 1000;

export async function expireStaleOffers(merchantId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - OFFER_TTL_MS);
  const result = await prisma.loan.updateMany({
    where: {
      status: 'OFFERED',
      offeredAt: { lt: cutoff },
      ...(merchantId ? { merchantId } : {}),
    },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}
