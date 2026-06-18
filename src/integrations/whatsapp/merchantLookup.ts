import { prisma } from '../../lib/db';
import { createConversation } from '../../services/conversationStore';

export function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/\s/g, '');
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('0')) {
      normalized = `+234${normalized.slice(1)}`;
    } else if (normalized.startsWith('234')) {
      normalized = `+${normalized}`;
    } else {
      normalized = `+${normalized}`;
    }
  }
  return normalized;
}

export async function findOrCreateMerchantByPhone(phone: string) {
  const normalized = normalizePhoneNumber(phone);

  let merchant = await prisma.merchant.findUnique({
    where: { phone: normalized },
  });

  if (!merchant) {
    const digits = normalized.replace(/\D/g, '');
    merchant = await prisma.merchant.create({
      data: {
        phone: normalized,
        name: 'WhatsApp Merchant',
        email: `wa-${digits}@placeholder.local`,
        alatpayAccountId: `alatpay_wa_${digits}`,
      },
    });
  }

  return merchant;
}

export async function getOrCreateWhatsAppConversation(merchantId: string): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: { merchantId, channel: 'WHATSAPP' },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing.id;
  }

  return createConversation(merchantId, 'WHATSAPP');
}
