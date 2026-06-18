import type { PaymentChannel, Transaction } from '../types';
import {
  generateReference,
  generateTransactionId,
  randomNigerianPhone,
  sendTransactionWebhook,
} from '../routes/webhooks';
import {
  appendTransaction,
  getMerchant,
  updateMerchantBalance,
} from './storage';

const CUSTOMER_NAMES = [
  'Adaeze Okafor',
  'Chidi Nwosu',
  'Fatima Bello',
  'Emeka Okonkwo',
  'Amina Yusuf',
  'Tunde Adeyemi',
  'Ngozi Eze',
  'Ibrahim Musa',
  'Blessing Ogunleye',
  'Yusuf Abdullahi',
  'Chioma Ibe',
  'Oluwaseun Bakare',
  'Halima Garba',
  'Kelechi Obi',
  'Zainab Aliyu',
  'Segun Oladipo',
  'Ifeoma Nnamdi',
  'Musa Danjuma',
  'Ronke Akintola',
  'Hassan Lawal',
  'Amaka Chukwu',
  'Biodun Fashola',
  'Maryam Sule',
  'Obinna Eze',
  'Aisha Mohammed',
  'Femi Adebayo',
  'Ebere Nwankwo',
  'Sadiq Abubakar',
  'Toyin Ojo',
  'Grace Okoro',
  'Kabir Ibrahim',
  'Nneka Uche',
  'Lanre Akinyemi',
  'Hadiza Usman',
  'Victor Etim',
  'Bisi Ogundimu',
  'Rukayat Adeleke',
  'Chukwudi Nwachukwu',
  'Funmilayo Akinwale',
  'Suleiman Bello',
];

export function pickCustomerName(): string {
  return CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
}

export function pickChannel(): PaymentChannel {
  const r = Math.random();
  if (r < 0.55) return 'card';
  if (r < 0.85) return 'transfer';
  return 'ussd';
}

/** Log-normal sample with approximate mean ₦12,000 */
export function sampleTicketSize(): number {
  if (Math.random() < 0.05) {
    return Math.round(80000 + Math.random() * 45000);
  }
  const mu = Math.log(12000);
  const sigma = 0.55;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = Math.exp(mu + sigma * z);
  return Math.max(500, Math.round(value));
}

export function txsPerDay(date: Date): number {
  const day = date.getDay();
  if (day === 0) return 4 + Math.floor(Math.random() * 2);
  if (day === 5 || day === 6) return 7 + Math.floor(Math.random() * 3);
  return 5 + Math.floor(Math.random() * 4);
}

export interface CustomerPaymentInput {
  merchantAccountId: string;
  amountNaira: number;
  customerName?: string;
  channel?: PaymentChannel;
  isRefund?: boolean;
}

export async function recordCustomerPayment(
  input: CustomerPaymentInput,
): Promise<Transaction> {
  const merchant = await getMerchant(input.merchantAccountId);
  if (!merchant) {
    throw new Error('MERCHANT_NOT_FOUND');
  }

  const amount = input.isRefund
    ? -Math.abs(input.amountNaira)
    : Math.abs(input.amountNaira);

  const tx: Transaction = {
    transactionId: generateTransactionId(),
    merchantAccountId: input.merchantAccountId,
    amountNaira: amount,
    customerName: input.customerName ?? pickCustomerName(),
    customerPhone: randomNigerianPhone(),
    channel: input.channel ?? pickChannel(),
    reference: generateReference(),
    timestamp: new Date().toISOString(),
    type: input.isRefund ? 'refund' : 'payment',
    status: 'successful',
  };

  await appendTransaction(tx);
  await updateMerchantBalance(input.merchantAccountId, amount);

  return tx;
}

export async function simulateCustomerPayment(
  input: CustomerPaymentInput,
): Promise<Transaction> {
  const tx = await recordCustomerPayment(input);

  void sendTransactionWebhook({
    transactionId: tx.transactionId,
    merchantAccountId: tx.merchantAccountId,
    amountNaira: tx.amountNaira,
    customerName: tx.customerName,
    customerPhone: tx.customerPhone,
    channel: tx.channel,
    reference: tx.reference,
  });

  return tx;
}

export async function runPaymentBurst(
  merchantAccountId: string,
  count = 5,
  durationMs = 30_000,
): Promise<void> {
  const interval = durationMs / count;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const amount = sampleTicketSize();
      void simulateCustomerPayment({ merchantAccountId, amountNaira: amount }).catch(
        (err) => console.error('[burst] payment failed:', err),
      );
    }, i * interval);
  }
}

export { CUSTOMER_NAMES };
