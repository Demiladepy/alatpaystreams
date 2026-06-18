import Decimal from 'decimal.js';

export type PayoutStatus = 'successful' | 'pending' | 'failed';
export type AccountStatus = 'active' | 'frozen' | 'closed';
export type PaymentChannel = 'card' | 'transfer' | 'ussd' | 'unknown';

export interface PayoutInput {
  merchantAccountId: string;
  amountNaira: Decimal;
  narration: string;
  reference: string;
}

export interface PayoutResult {
  status: PayoutStatus;
  transactionId: string;
  timestamp: Date;
  balanceAfter?: Decimal;
  failureReason?: string;
}

export interface AccountInfo {
  accountId: string;
  accountName: string;
  balanceNaira: Decimal;
  status: AccountStatus;
}

export interface ParsedWebhook {
  eventType: string;
  transactionId: string;
  merchantAccountId: string;
  amountNaira: Decimal;
  customerName: string;
  customerPhone?: string;
  channel: PaymentChannel;
  reference: string;
  receivedAt: Date;
}

export interface ALATPayService {
  payout(input: PayoutInput): Promise<PayoutResult>;
  getAccount(merchantAccountId: string): Promise<AccountInfo>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  parseWebhook(payload: unknown): ParsedWebhook;
}

export interface ALATPayHealth {
  mode: 'mock' | 'production';
  circuitOpen: boolean;
  circuitOpenUntil: string | null;
  consecutiveFailures: number;
  lastSuccessfulCallAt: string | null;
  baseUrl: string;
}

export class ALATPayCircuitOpenError extends Error {
  readonly code = 'ALATPAY_CIRCUIT_OPEN';

  constructor(message = 'ALATPay payout circuit is open — fail fast') {
    super(message);
    this.name = 'ALATPayCircuitOpenError';
  }
}

export class ALATPayClientError extends Error {
  readonly code = 'ALATPAY_CLIENT_ERROR';
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ALATPayClientError';
    this.statusCode = statusCode;
  }
}

export interface ALATPayClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  useMock: boolean;
}

export interface RawPayoutResponse {
  status: string;
  transactionId: string;
  amount?: number;
  timestamp?: string;
  balanceAfter?: number;
  failureReason?: string;
  message?: string;
}

export interface RawAccountResponse {
  accountId: string;
  accountName: string;
  balanceNaira: number;
  status: string;
}

export interface MockWebhookPayload {
  event: string;
  timestamp: string;
  data: {
    transactionId: string;
    merchantAccountId: string;
    amountNaira: number;
    customerName: string;
    customerPhone?: string;
    channel: string;
    reference: string;
  };
  signature?: string;
}
