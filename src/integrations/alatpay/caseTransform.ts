/** Mirror of alatpay_sdk.case_transformers — request bodies use camelCase on the wire. */

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const camelKey = snakeToCamelKey(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[camelKey] = snakeToCamel(value as Record<string, unknown>);
    } else {
      out[camelKey] = value;
    }
  }
  return out;
}

export function camelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[snakeKey] = camelToSnake(value as Record<string, unknown>);
    } else {
      out[snakeKey] = value;
    }
  }
  return out;
}
