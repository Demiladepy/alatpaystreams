export const RETRY_DELAYS_MS = [250, 500, 1200, 2800] as const;
export const MAX_RETRIES = 4;

export function jitterDelay(baseMs: number): number {
  const jitter = Math.random() * 0.25 * baseMs;
  return Math.round(baseMs + jitter);
}

export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 504 || status === 429;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    isRetryable: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES || !options.isRetryable(error)) {
        throw error;
      }
      options.onRetry?.(attempt + 1, error);
      const delay = jitterDelay(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!);
      await sleep(delay);
    }
  }

  throw lastError;
}

export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  constructor(
    private readonly threshold: number,
    private readonly openDurationMs: number,
  ) {}

  isOpen(): boolean {
    if (this.openUntil > Date.now()) {
      return true;
    }
    if (this.openUntil > 0 && this.openUntil <= Date.now()) {
      this.reset();
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openUntil = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.openDurationMs;
    }
  }

  reset(): void {
    this.failures = 0;
    this.openUntil = 0;
  }

  getState(): {
    circuitOpen: boolean;
    circuitOpenUntil: number;
    consecutiveFailures: number;
  } {
    return {
      circuitOpen: this.isOpen(),
      circuitOpenUntil: this.openUntil,
      consecutiveFailures: this.failures,
    };
  }
}
