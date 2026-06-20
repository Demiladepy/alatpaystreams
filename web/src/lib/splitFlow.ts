import type { BucketType } from "@/types";

/** Single accent for all flow paths — infrastructure-grade, not rainbow buckets */
export const FLOW_ACCENT = "#635BFF";

export function getFlowColor(): string {
  return FLOW_ACCENT;
}

export function particleCountForAmount(amountNaira: number): number {
  return Math.max(3, Math.min(30, Math.round(amountNaira / 3500)));
}

export const STREAM_EVENT = "alatpay:tx-stream";

export interface StreamSplit {
  bucketId: string | null;
  bucketName: string;
  bucketType: BucketType;
  amountNaira: string;
  rule?: { kind: string; value: number };
}

export interface StreamTransaction {
  transactionId: string;
  amountNaira: string;
  customerName: string;
  channel: "card" | "transfer" | "ussd" | "tap_and_pay";
  splits: StreamSplit[];
  receivedAt: string;
}

/** Queue delay between animations when burst fires — each tx gets its moment. */
export const ANIMATION_QUEUE_GAP_MS = 500;
