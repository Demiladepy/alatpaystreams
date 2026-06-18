import { logger } from '../../lib/logger';
import { ALATPayClientError } from './types';
import type { ALATPayClientConfig, RawAccountResponse, RawPayoutResponse } from './types';
import { isRetryableStatus, withRetry } from './retry';

export class ALATPayHttpClient {
  constructor(private readonly config: ALATPayClientConfig) {}

  async postPayout(body: {
    merchantAccountId: string;
    amountNaira: number;
    narration: string;
    reference: string;
  }): Promise<RawPayoutResponse> {
    return withRetry(
      () => this.request<RawPayoutResponse>('POST', '/alatpay/payout', body, body.reference),
      {
        isRetryable: (error) => {
          if (error instanceof ALATPayClientError) {
            return isRetryableStatus(error.statusCode);
          }
          return true;
        },
        onRetry: (attempt, error) => {
          logger.warn({ attempt, error, reference: body.reference }, 'ALATPay payout retry');
        },
      },
    );
  }

  async getAccount(merchantAccountId: string): Promise<RawAccountResponse> {
    return withRetry(
      () =>
        this.request<RawAccountResponse>(
          'GET',
          `/alatpay/account/${encodeURIComponent(merchantAccountId)}`,
        ),
      {
        isRetryable: (error) => {
          if (error instanceof ALATPayClientError) {
            return isRetryableStatus(error.statusCode);
          }
          return true;
        },
        onRetry: (attempt, error) => {
          logger.warn({ attempt, error, merchantAccountId }, 'ALATPay getAccount retry');
        },
      },
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.apiKey && !this.config.useMock) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let data: T | undefined;
      if (text) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          throw new ALATPayClientError(`Invalid JSON from ALATPay: ${text.slice(0, 200)}`, response.status);
        }
      }

      if (!response.ok) {
        const message =
          (data as { error?: string; message?: string } | undefined)?.error ??
          (data as { message?: string } | undefined)?.message ??
          text;
        throw new ALATPayClientError(message || `ALATPay HTTP ${response.status}`, response.status);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ALATPayClientError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new ALATPayClientError('ALATPay request timed out', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
