import type { BucketType } from "@/types";

/** Animation palette — distinct from static BucketCard accents for flow clarity */
export const splitFlowColors: Record<BucketType, string> = {
  TAX: "#B5443A",
  SAVINGS: "#0F3D2E",
  SUPPLIER: "#4A5568",
  OWNER_SALARY: "#D4A24C",
  LOAN_REPAYMENT: "#C4623B",
  CUSTOM: "#2D3748",
};

export function getFlowColor(type: BucketType): string {
  return splitFlowColors[type] ?? splitFlowColors.CUSTOM;
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
  channel: "card" | "transfer" | "ussd";
  splits: StreamSplit[];
  receivedAt: string;
}

/** Queue delay between animations when burst fires — each tx gets its moment. */
export const ANIMATION_QUEUE_GAP_MS = 500;
