/**
 * ALATPay credential resolution — aligned with the official Python SDK
 * @see https://pypi.org/project/alatpay-sdk/
 */
export interface ALATPayCredentials {
  secretKey: string;
  businessId?: string;
  webhookSecretKey?: string;
  publicKey?: string;
  baseUrl: string;
}

export function resolveSecretKey(): string | undefined {
  return (
    process.env.ALATPAY_SECRET_KEY?.trim() ||
    process.env.ALATPAY_API_KEY?.trim() ||
    undefined
  );
}

export function resolveBusinessId(): string | undefined {
  return (
    process.env.ALATPAY_BUSINESS_ID?.trim() ||
    process.env.ALATPAY_MERCHANT_ID?.trim() ||
    undefined
  );
}

export function resolveWebhookSecret(): string {
  return (
    process.env.ALATPAY_WEBHOOK_SECRET_KEY?.trim() ||
    process.env.ALATPAY_WEBHOOK_SECRET?.trim() ||
    ''
  );
}

export function resolvePublicKey(): string | undefined {
  return process.env.ALATPAY_PUBLIC_KEY?.trim() || undefined;
}

export function resolveOfficialBaseUrl(): string {
  return (
    process.env.ALATPAY_BASE_URL?.trim() ||
    'https://apibox.alatpay.ng'
  ).replace(/\/$/, '');
}

export function getALATPayCredentials(): ALATPayCredentials {
  const secretKey = resolveSecretKey();
  if (!secretKey) {
    throw new Error('ALATPAY_SECRET_KEY (or ALATPAY_API_KEY) is not configured');
  }

  return {
    secretKey,
    businessId: resolveBusinessId(),
    webhookSecretKey: resolveWebhookSecret() || undefined,
    publicKey: resolvePublicKey(),
    baseUrl: resolveOfficialBaseUrl(),
  };
}

export function isOfficialSdkMode(): boolean {
  return process.env.ALATPAY_USE_MOCK !== 'true';
}
