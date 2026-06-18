export type PaymentChannel = 'card' | 'transfer' | 'ussd';

export type TransactionType = 'payment' | 'refund' | 'payout';

export type TransactionStatus = 'successful' | 'pending' | 'failed';

export interface Merchant {
  id: string;
  accountName: string;
  phone: string;
  balanceNaira: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Transaction {
  transactionId: string;
  merchantAccountId: string;
  amountNaira: number;
  customerName: string;
  customerPhone: string;
  channel: PaymentChannel;
  reference: string;
  timestamp: string;
  type: TransactionType;
  status: TransactionStatus;
  narration?: string;
}

export interface PayoutRequest {
  merchantAccountId: string;
  amountNaira: number;
  narration: string;
  reference: string;
}

export interface PayoutResponse {
  status: 'successful' | 'pending';
  transactionId: string;
  amount: number;
  timestamp: string;
  balanceAfter: number;
}

export interface AccountResponse {
  accountId: string;
  accountName: string;
  balanceNaira: number;
  status: string;
}

export interface SimulatePaymentRequest {
  merchantAccountId: string;
  amountNaira: number;
  customerName?: string;
}

export interface WebhookPayload {
  event: 'transaction.received' | 'transaction.settled' | 'payout.completed';
  timestamp: string;
  data: {
    transactionId: string;
    merchantAccountId: string;
    amountNaira: number;
    customerName: string;
    customerPhone: string;
    channel: PaymentChannel;
    reference: string;
  };
  signature: string;
}

export const DEMO_MERCHANT_ID = 'alatpay_funke_001';
