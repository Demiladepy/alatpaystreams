import { logger } from '../../lib/logger';
import { ALATPayClientError } from './types';
import {
  getALATPayCredentials,
  resolveBusinessId,
  type ALATPayCredentials,
} from './config';
import { camelToSnake, snakeToCamel } from './caseTransform';

export interface OfficialApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T | null;
  raw: Record<string, unknown>;
}

export interface VirtualAccountData {
  id: string;
  merchant_id: string;
  virtual_bank_account_number: string;
  virtual_bank_code: string;
  transaction_id: string;
  amount: number;
  order_id: string;
  expired_at?: string;
}

export interface PaymentLinkData {
  id: string;
  payment_url: string;
  payment_reference: string;
  redirect_url?: string;
}

export interface TransactionData {
  id?: string;
  amount: number;
  description?: string;
  session_id?: string;
  merchant_name?: string;
}

const TIMEOUT_MS = 12_000;

/**
 * TypeScript client aligned with the official Python SDK (alatpay-sdk on PyPI).
 * Base URL: https://apibox.alatpay.ng
 * Auth header: Ocp-Apim-Subscription-Key
 */
export class ALATPayOfficialClient {
  constructor(private readonly creds: ALATPayCredentials = getALATPayCredentials()) {}

  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.creds.secretKey,
      'User-Agent': 'alatpaystreams-node/1.0',
    };
  }

  private withBusinessId<T extends Record<string, unknown>>(body: T): T {
    const businessId = (body.business_id as string | undefined) || resolveBusinessId();
    if (!businessId) {
      throw new ALATPayClientError(
        'business_id required — set ALATPAY_BUSINESS_ID or ALATPAY_MERCHANT_ID',
        400,
      );
    }
    return { ...body, business_id: businessId };
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    options?: { body?: Record<string, unknown>; query?: Record<string, string | number> },
  ): Promise<OfficialApiResponse<T>> {
    const url = new URL(`${this.creds.baseUrl}${path}`);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method,
        headers: this.headers(),
        body:
          options?.body && method !== 'GET'
            ? JSON.stringify(snakeToCamel(options.body))
            : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let raw: Record<string, unknown> = {};
      if (text) {
        try {
          raw = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new ALATPayClientError(`Invalid JSON from ALATPay: ${text.slice(0, 200)}`, res.status);
        }
      }

      if (!res.ok) {
        const message =
          (raw.message as string | undefined) ||
          (raw.title as string | undefined) ||
          text.slice(0, 200) ||
          `ALATPay HTTP ${res.status}`;
        throw new ALATPayClientError(message, res.status);
      }

      const normalized = camelToSnake(raw) as {
        status?: boolean;
        message?: string;
        data?: T | null;
      };

      return {
        status: Boolean(normalized.status),
        message: normalized.message ?? '',
        data: (normalized.data ?? null) as T | null,
        raw,
      };
    } catch (err) {
      if (err instanceof ALATPayClientError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new ALATPayClientError('ALATPay request timed out', 504);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Receive payments via a virtual account (bank transfer). */
  async payViaVirtualAccount(body: {
    amount: number;
    order_id: string;
    description?: string;
    currency?: string;
    business_id?: string;
    customer: {
      email: string;
      phone?: string;
      first_name: string;
      last_name: string;
    };
  }): Promise<OfficialApiResponse<VirtualAccountData>> {
    const payload = this.withBusinessId({
      currency: 'NGN',
      ...body,
    });
    logger.info({ orderId: body.order_id }, 'ALATPay payViaVirtualAccount');
    return this.call<VirtualAccountData>(
      'POST',
      '/bank-transfer/api/v1/bankTransfer/virtualAccount',
      { body: payload },
    );
  }

  /** Create a hosted payment link (checkout). */
  async createPaymentLink(body: {
    email: string;
    amount: number;
    currency?: string;
    redirect_url?: string;
    business_id?: string;
  }): Promise<OfficialApiResponse<PaymentLinkData>> {
    const payload = this.withBusinessId({
      currency: 'NGN',
      ...body,
    });
    return this.call<PaymentLinkData>(
      'POST',
      '/merchant-onboarding/api/v1/payment/initialize',
      { body: payload },
    );
  }

  /** Poll payment status for a payment-link reference. */
  async getTransactionViaPaymentLink(
    paymentReference: string,
  ): Promise<OfficialApiResponse<unknown>> {
    return this.call(
      'GET',
      `/merchant-onboarding/api/v1/payment/status/${encodeURIComponent(paymentReference)}`,
    );
  }

  /** Retrieve a transaction by ID. */
  async getTransaction(transactionId: string): Promise<OfficialApiResponse<TransactionData>> {
    return this.call<TransactionData>(
      'GET',
      `/alatpaytransaction/api/v1/transactions/${encodeURIComponent(transactionId)}`,
    );
  }

  /** Step 1 — create a static collection wallet for a merchant. */
  async initCreateStaticWallet(body: {
    static_wallet_type: string;
    bvn: string;
    email?: string;
    business_id?: string;
  }): Promise<OfficialApiResponse<unknown>> {
    const payload = this.withBusinessId(body);
    return this.call('POST', '/alatpay-wallet/api/v1/staticaccount', { body: payload });
  }

  /** Step 2 — finalize static wallet with OTP. */
  async finalizeCreateStaticWallet(body: {
    static_wallet_id: string;
    business_id: string;
    otp: string;
    tracking_id: string;
  }): Promise<OfficialApiResponse<unknown>> {
    return this.call('POST', '/alatpay-wallet/api/v1/staticaccount/validateAndCreate', {
      body,
    });
  }
}

let officialClient: ALATPayOfficialClient | null = null;

export function getOfficialALATPayClient(): ALATPayOfficialClient {
  if (!officialClient) {
    officialClient = new ALATPayOfficialClient();
  }
  return officialClient;
}

export function resetOfficialClientForTests(): void {
  officialClient = null;
}
