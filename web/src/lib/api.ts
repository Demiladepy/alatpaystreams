"use client";

import useSWR, { mutate } from "swr";
import type {
  Bucket,
  BucketWithActivity,
  Merchant,
  SimulateResponse,
  Transaction,
} from "@/types";
import {
  MOCK_MERCHANT_ID,
  getMockBucketsWithActivity,
  mockBuckets,
  mockMerchant,
  mockTransactions,
  simulateMockTransaction,
} from "./mocks";
import { emitStreamTransaction } from "@/hooks/useTransactionStream";
import type { StreamTransaction } from "@/lib/splitFlow";

let mockMode = false;

export function isMockMode(): boolean {
  return mockMode;
}

export function getApiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.trim() === "") return null;
  return url.replace(/\/$/, "");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("NO_API_URL");
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

function deriveActivityFromTransactions(
  buckets: Bucket[],
  transactions: Transaction[],
): BucketWithActivity[] {
  const days = 7;
  const now = new Date();

  return buckets.map((bucket) => {
    const daily: number[] = Array(days).fill(0);

    for (const tx of transactions) {
      const txDate = new Date(tx.receivedAt);
      const diffDays = Math.floor(
        (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays >= 0 && diffDays < days) {
        const idx = days - 1 - diffDays;
        const split = tx.splits.find((s) => s.bucketId === bucket.id);
        if (split) {
          daily[idx] += parseFloat(split.amountNaira);
        }
      }
    }

    return { ...bucket, recentActivity: daily };
  });
}

async function fetchBuckets(merchantId: string): Promise<BucketWithActivity[]> {
  try {
    const buckets = await apiFetch<Bucket[]>(
      `/api/merchants/${merchantId}/buckets`,
    );
    const transactions = await apiFetch<Transaction[]>(
      `/api/merchants/${merchantId}/transactions?limit=50`,
    );
    mockMode = false;
    return deriveActivityFromTransactions(buckets, transactions);
  } catch {
    mockMode = true;
    return getMockBucketsWithActivity();
  }
}

async function fetchTransactions(merchantId: string): Promise<Transaction[]> {
  try {
    const transactions = await apiFetch<Transaction[]>(
      `/api/merchants/${merchantId}/transactions?limit=50`,
    );
    mockMode = false;
    return transactions;
  } catch {
    mockMode = true;
    return [...mockTransactions];
  }
}

async function fetchMerchant(merchantId: string): Promise<Merchant> {
  if (!getApiBaseUrl()) {
    mockMode = true;
    return mockMerchant;
  }

  try {
    await apiFetch<Bucket[]>(`/api/merchants/${merchantId}/buckets`);
    mockMode = false;
    return { ...mockMerchant, id: merchantId };
  } catch {
    mockMode = true;
    return mockMerchant;
  }
}

export function useMerchant(merchantId: string = MOCK_MERCHANT_ID) {
  return useSWR(["merchant", merchantId], () => fetchMerchant(merchantId), {
    revalidateOnFocus: false,
  });
}

export function useBuckets(merchantId: string = MOCK_MERCHANT_ID) {
  return useSWR(["buckets", merchantId], () => fetchBuckets(merchantId), {
    revalidateOnFocus: false,
  });
}

export function useTransactions(merchantId: string = MOCK_MERCHANT_ID) {
  return useSWR(
    ["transactions", merchantId],
    () => fetchTransactions(merchantId),
    { revalidateOnFocus: false },
  );
}

export async function simulateTransaction(
  merchantId: string,
  amountNaira: number,
): Promise<SimulateResponse> {
  if (!getApiBaseUrl()) {
    mockMode = true;
    const result = simulateMockTransaction(amountNaira);
    emitStreamTransaction(result.streamPayload as StreamTransaction);
    await mutate(["buckets", merchantId]);
    await mutate(["transactions", merchantId]);
    return result;
  }

  try {
    const result = await apiFetch<SimulateResponse>(
      "/api/transactions/simulate",
      {
        method: "POST",
        body: JSON.stringify({ merchantId, amountNaira }),
      },
    );
    mockMode = false;
    await mutate(["buckets", merchantId]);
    await mutate(["transactions", merchantId]);
    return result;
  } catch {
    mockMode = true;
    const result = simulateMockTransaction(amountNaira);
    emitStreamTransaction(result.streamPayload as StreamTransaction);
    await mutate(["buckets", merchantId]);
    await mutate(["transactions", merchantId]);
    return result;
  }
}

export const MERCHANT_ID =
  process.env.NEXT_PUBLIC_MERCHANT_ID ?? MOCK_MERCHANT_ID;
