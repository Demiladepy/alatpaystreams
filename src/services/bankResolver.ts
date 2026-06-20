import { alatpayService } from '../integrations/alatpay';

const DEFAULT_BANK = { bankCode: 'GTB', bankName: 'GTBank' };

const SUPPLIER_BANKS: Record<string, { bankCode: string; bankName: string }> = {
  adebola: { bankCode: 'GTB', bankName: 'GTBank' },
  supplier: { bankCode: 'ACCESS', bankName: 'Access Bank' },
  default: DEFAULT_BANK,
};

export async function resolveMerchantBank(
  alatpayAccountId: string,
): Promise<{ bankCode: string; bankName: string }> {
  try {
    const account = await alatpayService.getAccount(alatpayAccountId);
    const ext = account as { bankCode?: string; bankName?: string };
    if (ext.bankCode && ext.bankName) {
      return { bankCode: ext.bankCode, bankName: ext.bankName };
    }
  } catch {
    // fall through
  }
  return DEFAULT_BANK;
}

export function resolveSupplierBank(supplierName: string): {
  bankCode: string;
  bankName: string;
} {
  const key = supplierName.toLowerCase();
  if (key.includes('adebola')) return SUPPLIER_BANKS.adebola;
  return SUPPLIER_BANKS.default;
}
